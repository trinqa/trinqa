import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { StellarService } from './services/stellar.service.js';
import { TrMockAnchorAdapter } from './adapters/tr-mock-anchor.adapter.js';
import { registerHealthRoutes } from './routes/v1/health.js';
import { registerCapabilitiesRoutes } from './routes/v1/capabilities.js';
import { registerDemoRoutes } from './routes/v1/demo.js';
import { PolicyService } from './services/policy.service.js';
import { registerPolicyRoutes } from './routes/v1/policy.js';

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  await app.register(cors, { origin: true });

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const policy = new PolicyService(env, stellar);

  registerHealthRoutes(app, stellar, anchor);
  registerCapabilitiesRoutes(app, policy);
  registerDemoRoutes(app, stellar, anchor);
  registerPolicyRoutes(app, policy);

  app.get('/', async () => ({ service: 'trinqa-backend', api: '/api/v1/health' }));

  return { app, stellar, anchor, policy };
}
