import { Asset } from '@stellar/stellar-sdk';
import type { AppConfig } from '../config/env.js';

export type TrinqaUsdcIdentity = {
  code: 'USDC';
  issuer: string;
  sacContractId: string;
  decimals: 7;
};

export function getTrinqaUsdcIdentity(config: Pick<AppConfig, 'USDC_ISSUER' | 'STELLAR_PASSPHRASE'>): TrinqaUsdcIdentity {
  const asset = new Asset('USDC', config.USDC_ISSUER);
  return {
    code: 'USDC',
    issuer: config.USDC_ISSUER,
    sacContractId: asset.contractId(config.STELLAR_PASSPHRASE),
    decimals: 7,
  };
}
