export interface MoneyAmount {
  value: string;
  currency: string;
}

export interface NetworkConfig {
  network: 'testnet' | 'mainnet';
  rpcUrl: string;
  horizonUrl: string;
  passphrase: string;
}

export interface IStellarAccountService {
  getBalances(accountId: string): Promise<MoneyAmount[]>;
  accountExists(accountId: string): Promise<boolean>;
  submitSignedXdr(signedXdr: string): Promise<string>;
}

export interface IAnchorService {
  discover(domain: string): Promise<Record<string, unknown>>;
  authenticateSep10(accountId: string): Promise<string>;
  startSep24Deposit(jwt: string, params: Record<string, string>): Promise<string>;
  getTransferStatus(id: string): Promise<Record<string, unknown>>;
}

export interface IPaymentRoutingService {
  getQuote(params: {
    sourceAsset: string;
    destinationAsset: string;
    amount: string;
  }): Promise<{
    fee: MoneyAmount;
    estimatedArrival: string;
    routeSummary: string;
  }>;
}

export interface IYieldService {
  getStrategies(): Promise<
    Array<{ id: string; name: string; apy: string; risk: string }>
  >;
  getPosition(accountId: string): Promise<MoneyAmount>;
  buildDepositXdr(params: Record<string, string>): Promise<string>;
  buildWithdrawXdr(params: Record<string, string>): Promise<string>;
}
