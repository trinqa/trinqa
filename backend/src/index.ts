import { env } from './config/env.js';
import { buildApp } from './app.js';

const { app } = await buildApp();

await app.listen({ port: env.PORT, host: env.HOST });
app.log.info(`Trinqa backend listening on http://${env.HOST}:${env.PORT}`);

// Closing the server also runs the onClose hooks, which stop the Horizon watcher.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close();
  });
}
