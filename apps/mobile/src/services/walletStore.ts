import { File, Paths } from 'expo-file-system';

/**
 * The device's custodial wallet key (testnet demo). It lives in the app's document
 * directory: it survives restarts and updates, and goes away with the app.
 */
function walletFile() {
  return new File(Paths.document, 'trinqa-wallet.json');
}

export function loadWalletKey(): string | null {
  try {
    const file = walletFile();
    if (!file.exists) return null;
    const parsed = JSON.parse(file.textSync()) as { walletKey?: unknown };
    return typeof parsed.walletKey === 'string' ? parsed.walletKey : null;
  } catch {
    return null;
  }
}

export function saveWalletKey(walletKey: string) {
  const file = walletFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify({ walletKey }));
}
