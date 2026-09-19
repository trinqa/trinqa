import type { AppConfig } from '../../backend/src/config/env.js';
import type { StellarService } from '../../backend/src/services/stellar.service.js';

export async function fundRecipientWithUsdcTrustline(params: {
  stellar: StellarService;
  env: AppConfig;
  recipientSecret: string;
}): Promise<{ publicKey: string }> {
  const { stellar, env, recipientSecret } = params;
  const publicKey = stellar.publicKeyFromSecret(recipientSecret);
  await stellar.friendbotFund(publicKey);
  const balances = await stellar.getBalances(publicKey);
  if (!stellar.hasUsdcTrustline(balances)) {
    const unsigned = await stellar.buildUsdcTrustlineXdr(publicKey);
    await stellar.submitSignedXdr(stellar.signXdr(unsigned, recipientSecret));
  }
  const after = await stellar.getBalances(publicKey);
  if (!stellar.hasUsdcTrustline(after)) {
    throw new Error('Recipient USDC trustline missing after setup');
  }
  const line = after.find((b) => b.assetCode === 'USDC' && b.assetIssuer === env.USDC_ISSUER);
  if (!line) {
    throw new Error(`Recipient trustline not for mock-anchor issuer ${env.USDC_ISSUER}`);
  }
  return { publicKey };
}
