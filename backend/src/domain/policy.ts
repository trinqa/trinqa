import { z } from 'zod';

export const riskProfileSchema = z.number().int().min(0).max(2);

const SOROBAN_SYMBOL = /^[A-Za-z0-9_]{1,32}$/;
const DEFINDEX_STRATEGY_ID = /^defindex:(C[A-Z2-7]{55})$/;

/**
 * Strategy ids (`defindex:<vault C-address>`, 65 bytes) do not fit a Soroban Symbol (max 32).
 * The policy contract stores this short, deterministic alias instead: `dfx_` + first 12 chars of the vault.
 */
export function policyStrategySymbol(strategyId: string): string {
  const vault = DEFINDEX_STRATEGY_ID.exec(strategyId)?.[1];
  const symbol = vault ? `dfx_${vault.slice(0, 12)}` : strategyId;
  if (!SOROBAN_SYMBOL.test(symbol)) {
    throw new Error(`Strategy "${strategyId}" cannot be stored as a Soroban Symbol`);
  }
  return symbol;
}

/** A strategy reference the API accepts: a full strategy id or an already-short Symbol. */
const strategyRefSchema = z.string().refine((v) => {
  try {
    policyStrategySymbol(v);
    return true;
  } catch {
    return false;
  }
}, 'strategy must be a strategy id (defindex:C…) or a Soroban Symbol (<= 32 chars, [A-Za-z0-9_])');

export const userPolicyInputSchema = z.object({
  riskProfile: riskProfileSchema,
  targetTimestamp: z.coerce.bigint().refine((v) => v > 0n, 'targetTimestamp must be positive'),
  liquidityTargetBps: z.number().int().min(0).max(10_000),
  automationPaused: z.boolean().default(false),
  allowedStrategies: z.array(strategyRefSchema).default([]),
});

export type UserPolicyInput = z.infer<typeof userPolicyInputSchema>;

export const policyBuildActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_policy'),
    accountId: z.string().min(56).max(56),
    policy: userPolicyInputSchema,
  }),
  z.object({
    action: z.literal('update_risk'),
    accountId: z.string().min(56).max(56),
    riskProfile: riskProfileSchema,
  }),
  z.object({
    action: z.literal('update_target_date'),
    accountId: z.string().min(56).max(56),
    targetTimestamp: z.coerce.bigint(),
  }),
  z.object({
    action: z.literal('set_strategy_allowed'),
    accountId: z.string().min(56).max(56),
    strategy: strategyRefSchema,
    allowed: z.boolean(),
  }),
  z.object({
    action: z.literal('authorize_allocation'),
    accountId: z.string().min(56).max(56),
    strategy: strategyRefSchema,
    amountBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    action: z.literal('authorize_rebalance'),
    accountId: z.string().min(56).max(56),
    fromStrategy: strategyRefSchema,
    toStrategy: strategyRefSchema,
  }),
  z.object({
    action: z.literal('pause_automation'),
    accountId: z.string().min(56).max(56),
    paused: z.boolean(),
  }),
]);

export type PolicyBuildRequest = z.infer<typeof policyBuildActionSchema>;

export type PolicyView = {
  accountId: string;
  configured: boolean;
  riskProfile?: number;
  targetTimestamp?: string;
  liquidityTargetBps?: number;
  automationPaused?: boolean;
  allowedStrategies?: string[];
};

function readField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return undefined;
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  const raw = readField(obj, ...keys);
  if (raw === undefined) {
    return undefined;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function policyViewFromNative(
  accountId: string,
  native: Record<string, unknown> | null | undefined,
): PolicyView {
  if (!native) {
    return { accountId, configured: false };
  }

  const inner =
    native.value && typeof native.value === 'object'
      ? (native.value as Record<string, unknown>)
      : native;

  const strategies = readField(
    inner,
    'allowed_strategies',
    'allowedStrategies',
  ) as { tag?: string; values?: string[] } | string[] | undefined;
  let allowedStrategies: string[] = [];
  if (Array.isArray(strategies)) {
    allowedStrategies = strategies.map(String);
  } else if (strategies && Array.isArray(strategies.values)) {
    allowedStrategies = strategies.values.map(String);
  }

  const riskProfile = readNumber(inner, 'risk_profile', 'riskProfile');
  const liquidityTargetBps = readNumber(inner, 'liquidity_target_bps', 'liquidityTargetBps');
  const targetRaw = readField(inner, 'target_timestamp', 'targetTimestamp');
  const automationPaused = readField(inner, 'automation_paused', 'automationPaused');

  return {
    accountId,
    configured: riskProfile !== undefined,
    riskProfile,
    targetTimestamp: targetRaw !== undefined ? String(targetRaw) : undefined,
    liquidityTargetBps,
    automationPaused: automationPaused !== undefined ? Boolean(automationPaused) : undefined,
    allowedStrategies,
  };
}
