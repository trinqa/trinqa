export type LegStatus = 'PASS' | 'BLOCKED' | 'FAIL' | 'PARTIAL';

export type TrinqaLegReport = Record<string, LegStatus>;

/** Full lifecycle requires every partner leg to have a real PASS (not BLOCKED/PARTIAL). */
export function isFullLifecyclePass(report: TrinqaLegReport): boolean {
  return (
    report.Anchor === 'PASS' &&
    report.Policy === 'PASS' &&
    report.DeFindex === 'PASS' &&
    report.Soroswap === 'PASS' &&
    report['Earn-funded payment'] === 'PASS'
  );
}

/** Partner legs must not PASS without credentials — only BLOCKED or honest FAIL/PARTIAL. */
export function initialPartnerLegStatus(env: {
  DEFINDEX_API_KEY?: string;
  DEFINDEX_VAULT_ADDRESS?: string;
  SOROSWAP_API_KEY?: string;
}): { report: TrinqaLegReport; blockers: string[] } {
  const blockers: string[] = [];
  const report: TrinqaLegReport = {
    Anchor: 'FAIL',
    Policy: 'FAIL',
    DeFindex: 'BLOCKED',
    Soroswap: 'BLOCKED',
    'Earn-funded payment': 'BLOCKED',
  };

  if (!env.DEFINDEX_API_KEY || !env.DEFINDEX_VAULT_ADDRESS) {
    blockers.push('DEFINDEX_API_KEY/DEFINDEX_VAULT_ADDRESS');
  }
  if (!env.SOROSWAP_API_KEY) {
    blockers.push('SOROSWAP_API_KEY');
  }

  return { report, blockers };
}
