import { z } from 'zod';

export const riskProfileSchema = z.number().int().min(0).max(2);

export const userPolicyInputSchema = z.object({
  riskProfile: riskProfileSchema,
  targetTimestamp: z.coerce.bigint().refine((v) => v > 0n, 'targetTimestamp must be positive'),
  liquidityTargetBps: z.number().int().min(0).max(10_000),
  automationPaused: z.boolean().default(false),
  allowedStrategies: z.array(z.string().min(1).max(32)).default([]),
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
    strategy: z.string().min(1).max(32),
    allowed: z.boolean(),
  }),
  z.object({
    action: z.literal('authorize_allocation'),
    accountId: z.string().min(56).max(56),
    strategy: z.string().min(1).max(32),
    amountBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    action: z.literal('authorize_rebalance'),
    accountId: z.string().min(56).max(56),
    fromStrategy: z.string().min(1).max(32),
    toStrategy: z.string().min(1).max(32),
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
