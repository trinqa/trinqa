import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  env,
  isPushWatcherEnabled,
  resolveCorsOrigins,
  resolveOperationsDataDir,
} from './config/env.js';
import { StellarService } from './services/stellar.service.js';
import { TrMockAnchorAdapter } from './adapters/tr-mock-anchor.adapter.js';
import { DefindexYieldAdapter } from './adapters/defindex-yield.adapter.js';
import { SoroswapAdapter } from './adapters/soroswap.adapter.js';
import { registerHealthRoutes } from './routes/v1/health.js';
import { registerCapabilitiesRoutes } from './routes/v1/capabilities.js';
import { registerDemoRoutes } from './routes/v1/demo.js';
import { PolicyService } from './services/policy.service.js';
import { registerPolicyRoutes } from './routes/v1/policy.js';
import { CapabilityService } from './services/capability.service.js';
import { YieldService } from './services/yield.service.js';
import { QuoteStore } from './services/quote-store.service.js';
import { createOperationStore } from './services/operation-store.js';
import { PaymentRouter } from './services/payment-router.service.js';
import { PaymentExecutionService } from './services/payment-execution.service.js';
import { registerYieldRoutes } from './routes/v1/yield.js';
import { registerPaymentRoutes } from './routes/v1/payments.js';
import { registerOperationRoutes } from './routes/v1/operations.js';
import { registerActivityRoutes } from './routes/v1/activity.js';
import { registerAnchorRoutes } from './routes/v1/anchor.js';
import { AnchorSessionStore } from './services/anchor-session-store.service.js';
import { registerAccountRoutes } from './routes/v1/accounts.js';
import { registerTransactionRoutes } from './routes/v1/transactions.js';
import { registerSwapRoutes } from './routes/v1/swaps.js';
import { registerWaitlistRoutes } from './routes/v1/waitlist.js';
import { createWaitlistStore } from './services/waitlist-store.js';
import { createAnchorRegistry } from './services/anchor-registry.service.js';
import { registerAnchorDirectoryRoutes } from './routes/v1/anchors.js';
import { RoutePlanner } from './services/route-planner.service.js';
import { NoopAdvisor } from './services/route-advisor.js';
import { createRouteAdvisorFromEnv } from './adapters/jev-advisor.js';
import { registerRouteRoutes } from './routes/v1/routes.js';
import { DEFAULT_ADVISOR_MIN_CONFIDENCE } from './domain/route.js';
import { createPushTokenRegistry } from './services/push-tokens.service.js';
import { createPushSender } from './services/push-sender.service.js';
import { registerNotificationRoutes } from './routes/v1/notifications.js';
import {
  IncomingPaymentWatcher,
  createHorizonPaymentSource,
} from './services/incoming-payment-watcher.service.js';
import { createHorizonCursorStore } from './services/horizon-cursor-store.js';
import { CustodialWallets } from './services/custodial-wallet.service.js';

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  await app.register(cors, {
    // The landing page calls this API from https://trinqa.com, so the browser
    // needs that origin echoed back; localhost stays allowed for development.
    origin: resolveCorsOrigins(env),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-waitlist-token'],
    credentials: false,
  });

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const defindex = new DefindexYieldAdapter(env);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  const policy = new PolicyService(env, stellar);
  const capabilities = new CapabilityService(env, anchor, defindex, soroswap, policy);
  const quotes = new QuoteStore();
  const operations = createOperationStore(resolveOperationsDataDir());
  const anchorSessions = new AnchorSessionStore();
  const waitlist = createWaitlistStore(resolveOperationsDataDir(), env.DATABASE_URL);
  const wallets = CustodialWallets.fromConfig(env, stellar);
  const pushTokens = createPushTokenRegistry(resolveOperationsDataDir());
  const pushSender = createPushSender(pushTokens, { logger: app.log });
  const yieldSvc = new YieldService(defindex, policy, operations, stellar, pushSender);
  const paymentExecution = new PaymentExecutionService(
    env,
    stellar,
    defindex,
    soroswap,
    anchor,
    anchorSessions,
    yieldSvc,
    quotes,
    operations,
    pushSender,
  );
  // Phase 2 routing: every anchor behind one directory, Jev as an optional advisor.
  const anchorRegistry = createAnchorRegistry(env, anchor);
  const routeAdvisor = createRouteAdvisorFromEnv(env) ?? new NoopAdvisor();
  const routePlanner = new RoutePlanner(anchorRegistry, routeAdvisor, {
    usdcIssuer: env.USDC_ISSUER,
    minConfidence: env.JEV_MIN_CONFIDENCE ?? DEFAULT_ADVISOR_MIN_CONFIDENCE,
  });
  const paymentRouter = new PaymentRouter(
    env,
    stellar,
    anchor,
    soroswap,
    defindex,
    capabilities,
    quotes,
    operations,
    anchorSessions,
    paymentExecution,
    routePlanner,
  );

  registerHealthRoutes(app, stellar, anchor, defindex, soroswap, policy);
  registerCapabilitiesRoutes(app, capabilities);
  registerDemoRoutes(app, stellar, anchor, anchorSessions, wallets);
  registerPolicyRoutes(app, policy);
  registerYieldRoutes(app, yieldSvc);
  registerPaymentRoutes(app, paymentRouter, paymentExecution);
  registerOperationRoutes(app, operations);
  registerActivityRoutes(app, operations);
  registerAnchorRoutes(app, anchor, anchorSessions, operations, pushSender);
  registerAccountRoutes(app, stellar);
  registerTransactionRoutes(app, stellar);
  registerSwapRoutes(app, soroswap);
  registerWaitlistRoutes(app, waitlist, { adminToken: env.WAITLIST_ADMIN_TOKEN });
  registerAnchorDirectoryRoutes(app, anchorRegistry);
  registerRouteRoutes(app, routePlanner);
  registerNotificationRoutes(app, pushTokens, wallets);

  // Release the waitlist connection pool with the server.
  app.addHook('onClose', async () => waitlist.close());

  // The one event source that works with the app closed: the ledger itself.
  const paymentWatcher = new IncomingPaymentWatcher(
    pushTokens,
    pushSender,
    createHorizonPaymentSource(stellar),
    createHorizonCursorStore(resolveOperationsDataDir()),
    { code: env.usdcAssetCode, issuer: env.USDC_ISSUER },
    { intervalMs: env.PUSH_WATCHER_INTERVAL_MS, logger: app.log },
  );
  if (isPushWatcherEnabled(env)) {
    paymentWatcher.start();
    app.addHook('onClose', async () => paymentWatcher.stop());
  }

  app.get('/', async () => ({ service: 'trinqa-backend', api: '/api/v1/health' }));

  return {
    app,
    stellar,
    anchor,
    policy,
    defindex,
    soroswap,
    capabilities,
    yieldSvc,
    paymentRouter,
    paymentExecution,
    operations,
    anchorSessions,
    waitlist,
    anchorRegistry,
    routePlanner,
    routeAdvisor,
    pushTokens,
    pushSender,
    paymentWatcher,
  };
}
