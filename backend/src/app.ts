import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { StellarService } from './services/stellar.service.js';
import { TrMockAnchorAdapter } from './adapters/tr-mock-anchor.adapter.js';
import { registerHealthRoutes } from './routes/v1/health.js';
import { registerCapabilitiesRoutes } from './routes/v1/capabilities.js';
import { registerDemoRoutes } from './routes/v1/demo.js';

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  await app.register(cors, { origin: true });

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);

  registerHealthRoutes(app, stellar, anchor);
  registerCapabilitiesRoutes(app);
  registerDemoRoutes(app, stellar, anchor);

  app.get('/', async () => ({ service: 'trinqa-backend', api: '/api/v1/health' }));

  return { app, stellar, anchor };
}
