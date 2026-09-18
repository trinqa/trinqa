import { env } from './config/env.js';
import { buildApp } from './app.js';

const { app } = await buildApp();

await app.listen({ port: env.PORT, host: env.HOST });
app.log.info(`Trinqa backend listening on http://${env.HOST}:${env.PORT}`);
