import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { demoSignerGuard } from '../../guards/demo-signer.guard.js';
import type { CustodialWallets } from '../../services/custodial-wallet.service.js';
import {
  isExpoPushToken,
  maskPushToken,
  type PushTokenRegistry,
} from '../../services/push-tokens.service.js';
import { sendApiError } from './http-errors.js';
import { signerForRequest } from './wallet-signer.js';

const registerBody = z.object({
  expoPushToken: z.string().refine(isExpoPushToken, 'Invalid Expo push token'),
  platform: z.enum(['ios', 'android']),
});

const unregisterBody = z.object({
  expoPushToken: z.string().refine(isExpoPushToken, 'Invalid Expo push token'),
});

export function registerNotificationRoutes(
  app: FastifyInstance,
  devices: PushTokenRegistry,
  wallets: CustodialWallets | null,
): void {
  /**
   * A push token belongs to one device, so there is no env-demo fallback here: without a
   * wallet key we would attach the token to the shared demo account.
   */
  app.post('/api/v1/notifications/devices', { preHandler: demoSignerGuard }, async (request, reply) => {
    try {
      const account = signerForRequest(request, wallets).publicKey;
      const body = registerBody.parse(request.body);
      const device = await devices.register({ accountId: account, ...body });
      app.log.info(
        { account, platform: device.platform, token: maskPushToken(device.expoPushToken) },
        'notifications: device registered',
      );
      const registered = await devices.listByAccount(account);
      return { account, platform: device.platform, devices: registered.length };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid device payload' });
      }
      return sendApiError(reply, err);
    }
  });

  app.delete('/api/v1/notifications/devices', { preHandler: demoSignerGuard }, async (request, reply) => {
    try {
      const account = signerForRequest(request, wallets).publicKey;
      const body = unregisterBody.parse(request.body);
      // The registry is keyed globally by token, so a device may only drop one of its own.
      const owned = await devices.listByAccount(account);
      const removed =
        owned.some((d) => d.expoPushToken === body.expoPushToken) &&
        (await devices.remove(body.expoPushToken));
      const remaining = await devices.listByAccount(account);
      return { account, removed, devices: remaining.length };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid device payload' });
      }
      return sendApiError(reply, err);
    }
  });
}
