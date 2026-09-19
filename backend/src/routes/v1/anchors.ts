import type { FastifyInstance } from 'fastify';
import type { AnchorDirectory } from '../../domain/anchor.js';

/** GET /api/v1/anchors — the anchor directory (executable TR mock + discovered anchors). */
export function registerAnchorDirectoryRoutes(app: FastifyInstance, directory: AnchorDirectory): void {
  app.get('/api/v1/anchors', async () => {
    const anchors = await directory.list();
    return { anchors };
  });
}
