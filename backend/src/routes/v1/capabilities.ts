import type { FastifyInstance } from 'fastify';
import type { CapabilityService } from '../../services/capability.service.js';

export function registerCapabilitiesRoutes(app: FastifyInstance, capabilities: CapabilityService): void {
  app.get('/api/v1/capabilities', async () => capabilities.buildCapabilities());
}
