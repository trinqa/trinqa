import Fastify from 'fastify';
import cors from '@fastify/cors';
import path from 'node:path';
import { env } from './config/env.js';
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
import { registerYieldRoutes } from './routes/v1/yield.js';
import { registerPaymentRoutes } from './routes/v1/payments.js';
import { registerOperationRoutes } from './routes/v1/operations.js';
import { registerActivityRoutes } from './routes/v1/activity.js';
import { registerAnchorRoutes } from './routes/v1/anchor.js';
import { AnchorSessionStore } from './services/anchor-session-store.service.js';
import { registerAccountRoutes } from './routes/v1/accounts.js';
import { registerTransactionRoutes } from './routes/v1/transactions.js';
import { registerSwapRoutes } from './routes/v1/swaps.js';

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  await app.register(cors, { origin: true });

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const defindex = new DefindexYieldAdapter(env);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  const policy = new PolicyService(env, stellar);
  const capabilities = new CapabilityService(env, anchor, defindex, soroswap, policy);
  const yieldSvc = new YieldService(defindex, policy);
  const quotes = new QuoteStore();
  const dataDir = env.OPERATIONS_DATA_DIR ?? path.resolve(process.cwd(), '.data');
  const operations = createOperationStore(dataDir);
  const anchorSessions = new AnchorSessionStore();
  const paymentRouter = new PaymentRouter(
    env,
    stellar,
    anchor,
    soroswap,
    capabilities,
    quotes,
    operations,
  );

  registerHealthRoutes(app, stellar, anchor, defindex, soroswap, policy);
  registerCapabilitiesRoutes(app, capabilities);
  registerDemoRoutes(app, stellar, anchor);
  registerPolicyRoutes(app, policy);
  registerYieldRoutes(app, yieldSvc);
  registerPaymentRoutes(app, paymentRouter, stellar, operations);
  registerOperationRoutes(app, operations);
  registerActivityRoutes(app, operations);
  registerAnchorRoutes(app, anchor, anchorSessions);
  registerAccountRoutes(app, stellar);
  registerTransactionRoutes(app, stellar);
  registerSwapRoutes(app, soroswap);

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
    operations,
  };
}
