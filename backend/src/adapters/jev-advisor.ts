import { z } from 'zod';
import type {
  AdvisorInput,
  RouteAdvice,
  RouteAdvisor,
  RouteCandidate,
  RouteFactorKey,
  RouteFactors,
} from '../domain/route.js';
import { ADVISOR_FACTORS, DEFAULT_ADVISOR_MIN_CONFIDENCE } from '../domain/route.js';

/**
 * Adapter for Jev, TypeSafe's structured decision model, reached through OpenRouter's
 * alpha Decisions endpoint.
 *
 * Endpoint / auth / request shape confirmed from:
 *  - OpenRouter's public model page for typesafe/jev-1.13 (https://openrouter.ai/typesafe):
 *    pricing, context window, and that Jev "runs on the Decisions API, not chat completions".
 *  - Community examples calling `POST https://openrouter.ai/api/alpha/decisions` with
 *    `Authorization: Bearer <OPENROUTER_API_KEY>` and body `{ model, state, questions }`
 *    (github.com/vinaychawla-ops/jev-openrouter-example, github.com/alperenerol/jev-1.13-mini-benchmark).
 *  - TypeSafe's own docs (docs.typesafe.ai) and the mirrored AI/ML API docs
 *    (docs.aimlapi.com/api-references/decision-models/typesafe/jev), which describe the three
 *    question types in detail:
 *      - noul:   { type: 'noul', instructions, criteria?: { true, false } }
 *                -> answer { type: 'noul', noul: number 0..1 }
 *      - choice: { type: 'choice', instructions, criteria: Record<optionKey, description> }
 *                -> answer { type: 'choice', choice: string, confidence: number, probabilities }
 *      - score:  { type: 'score', instructions, criteria: string[] (lowest first) }
 *                -> answer { type: 'score', score: number (fractional ok), confidence: number,
 *                            legend: Record<index, description>, probabilities }
 *    Top-level response: { model, answers: Record<questionId, answer>, usage: { ..., cost } } —
 *    the community benchmark explicitly documents `usage.cost` on OpenRouter's endpoint (the
 *    AI/ML API mirror instead reports plain input/output token counts), so this adapter reads
 *    `usage.cost` opportunistically and never depends on it.
 *
 * None of the above was independently reproducible with fetchable, complete JSON examples
 * (OpenRouter's own /docs pages do not surface the Decisions endpoint, and GitHub's fetch
 * tooling truncated the example source files), so every response field is parsed defensively:
 * unknown/missing fields simply drop that route's advice rather than throwing.
 *
 * Jev is unreliable at arithmetic, so it is never asked about netCost or speed — only the
 * judgment factors in ADVISOR_FACTORS, scored on a 0-4 rubric we define and normalize to 0-100.
 */

const DEFAULT_MODEL = 'typesafe/jev-1.13';
const DEFAULT_TIMEOUT_MS = 2500;
const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';

export interface JevAdvisorOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  endpoint?: string;
  fetch?: typeof fetch;
  /** Factor answers below this confidence are dropped; defaults to DEFAULT_ADVISOR_MIN_CONFIDENCE. */
  minFactorConfidence?: number;
}

/** The subset of RouteFactorKey that ADVISOR_FACTORS actually contains (netCost/speed excluded). */
type AdvisorFactorKey = 'reliability' | 'liquidity' | 'horizonFit' | 'riskFit' | 'yieldImpact';

/** A 0-4 rubric (lowest first), matching the "score" question type's `criteria: string[]`. */
interface FactorDefinition {
  instructions: string;
  criteria: readonly string[];
}

const FACTOR_QUESTION_SUFFIX: Record<AdvisorFactorKey, string> = {
  reliability: 'reliability',
  liquidity: 'liquidity',
  horizonFit: 'horizon_fit',
  riskFit: 'risk_fit',
  yieldImpact: 'yield_impact',
};

const FACTOR_DEFINITIONS: Record<AdvisorFactorKey, FactorDefinition> = {
  reliability: {
    instructions:
      "Judge how reliable this anchor route is for actually completing this transfer, based on its status and reported reliability signal in `state`. Do not compute or compare numbers yourself — use the reliability figure and status only as qualitative context.",
    criteria: [
      'Very unreliable: likely to fail, be unavailable, or misbehave for this transfer.',
      'Below average reliability: a meaningful chance of failure or delay.',
      'Average or uncertain reliability: no strong signal either way.',
      'Above average reliability: likely to complete without issues.',
      'Very reliable: strong health status and track record for this transfer.',
    ],
  },
  liquidity: {
    instructions:
      "Judge how comfortably the requested amount fits within this route's published rail limits (min/max), given in `state`. Do not perform the arithmetic comparison precisely yourself; give a qualitative judgment of headroom.",
    criteria: [
      "Requested amount is far outside the anchor's published min/max limits for this rail.",
      'Requested amount is close to a limit boundary, leaving little headroom.',
      'Requested amount fits within limits, but headroom is unclear or only moderate.',
      'Requested amount comfortably fits within limits with good headroom.',
      'Requested amount fits with ample headroom, well within both min and max.',
    ],
  },
  horizonFit: {
    instructions:
      "Judge how well this route's expected settlement pace (status, estimated minutes) fits the user's stated time horizon (daysToTarget) in `state`.",
    criteria: [
      "This route's settlement pace is a poor fit for the user's stated horizon.",
      "Fit is weak; the user's horizon leaves little margin for this route's pace.",
      'Fit is neutral or unclear.',
      "Fit is good; this route's pace comfortably suits the user's horizon.",
      "Fit is excellent; this route's pace is ideally matched to the user's horizon.",
    ],
  },
  riskFit: {
    instructions:
      "Judge how well this route's characteristics (status, reliability) match the user's stated risk profile (0=conservative, 1=moderate, 2=aggressive) in `state`.",
    criteria: [
      "This route is a poor match for the user's risk profile.",
      "Weak match between this route's characteristics and the user's risk profile.",
      'Neutral or unclear match.',
      "Good match between this route's characteristics and the user's risk profile.",
      "Excellent match; this route is well aligned with the user's risk tolerance.",
    ],
  },
  yieldImpact: {
    instructions:
      'Judge whether using this route would help or hinder the user later putting the settled funds to productive, yield-bearing use (for example, because of how quickly and reliably funds become available).',
    criteria: [
      "Strongly hinders the user's ability to use the funds productively afterward.",
      'Somewhat hinders later productive use of the funds.',
      'Neutral or unclear impact on later productive use.',
      'Somewhat helps later productive use of the funds.',
      "Strongly helps the user put the funds to productive use afterward.",
    ],
  },
};

/** ADVISOR_FACTORS narrowed to the literal union (it is netCost/speed-free by contract). */
const JUDGMENT_FACTORS = ADVISOR_FACTORS as readonly AdvisorFactorKey[];

const BEST_ROUTE_QUESTION_ID = 'best_route';
const QUESTION_ID_PATTERN = /^[a-z0-9_]+$/;

/** Loose, defensive parse of one Jev answer — accepts whatever fields are present. */
const jevAnswerSchema = z
  .object({
    type: z.string().optional(),
    noul: z.number().optional(),
    choice: z.string().optional(),
    score: z.number().optional(),
    confidence: z.number().optional(),
    probabilities: z.record(z.string(), z.number()).optional(),
    legend: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const decisionsResponseSchema = z
  .object({
    model: z.string().optional(),
    answers: z.record(z.string(), jevAnswerSchema),
    usage: z
      .object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
        cost: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type JevDecisionsResponse = z.infer<typeof decisionsResponseSchema>;
type JevAnswer = z.infer<typeof jevAnswerSchema>;

function routeAlias(index: number): string {
  return `r${index}`;
}

function questionId(alias: string, factor: AdvisorFactorKey): string {
  const id = `${alias}_${FACTOR_QUESTION_SUFFIX[factor]}`;
  if (!QUESTION_ID_PATTERN.test(id)) {
    // Defensive: should be unreachable given the static suffix table and r<index> aliases.
    throw new Error(`invalid jev question id: ${id}`);
  }
  return id;
}

function buildRouteAliases(routes: RouteCandidate[]): Map<string, string> {
  const map = new Map<string, string>();
  routes.forEach((route, index) => {
    map.set(route.routeId, routeAlias(index));
  });
  return map;
}

function buildState(input: AdvisorInput, aliasByRouteId: Map<string, string>): Record<string, unknown> {
  const { request } = input;
  return {
    request: {
      direction: request.direction,
      fiatCurrency: request.fiatCurrency,
      assetCode: request.assetCode,
      amount: request.amount,
      kycStatus: request.kycStatus ?? 'UNKNOWN',
      user: request.user
        ? { riskProfile: request.user.riskProfile, daysToTarget: request.user.daysToTarget }
        : null,
    },
    routes: input.routes.map((route) => ({
      id: aliasByRouteId.get(route.routeId),
      anchorName: route.anchorName,
      status: route.status,
      estimatedMinutes: route.facts.estimatedMinutes ?? null,
      reliability: route.facts.reliability,
      fees: {
        percent: route.facts.feePercent ?? null,
        fixed: route.facts.feeFixed ?? null,
      },
      rail: {
        min: route.rail.min ?? null,
        max: route.rail.max ?? null,
        methods: route.rail.methods,
      },
      indicativePrice: route.facts.indicativePrice
        ? {
            sellAmount: route.facts.indicativePrice.sellAmount,
            buyAmount: route.facts.indicativePrice.buyAmount,
            price: route.facts.indicativePrice.price,
          }
        : null,
    })),
  };
}

function buildQuestions(routes: RouteCandidate[], aliasByRouteId: Map<string, string>): Record<string, unknown> {
  const questions: Record<string, unknown> = {};
  for (const route of routes) {
    const alias = aliasByRouteId.get(route.routeId);
    if (!alias) continue;
    for (const factor of JUDGMENT_FACTORS) {
      const def = FACTOR_DEFINITIONS[factor];
      questions[questionId(alias, factor)] = {
        type: 'score',
        instructions: def.instructions,
        criteria: [...def.criteria],
      };
    }
  }
  if (routes.length > 1) {
    const criteria: Record<string, string> = {};
    for (const route of routes) {
      const alias = aliasByRouteId.get(route.routeId);
      if (!alias) continue;
      criteria[alias] = `Route ${alias}: ${route.anchorName} (${route.status}).`;
    }
    questions[BEST_ROUTE_QUESTION_ID] = {
      type: 'choice',
      instructions:
        'Considering only reliability, liquidity, fit to the user horizon and risk profile, and yield impact (net cost and speed are already scored deterministically elsewhere), which route would you recommend?',
      criteria,
    };
  }
  return questions;
}

/** Normalizes a "score" answer to 0-100, using the legend's max index when present, otherwise
 *  falling back to the rubric length we sent. Returns null when the answer is unusable. */
function normalizeScoreAnswer(answer: JevAnswer | undefined, rubricLevels: number): { value: number; confidence: number } | null {
  if (!answer) return null;
  const { score, confidence } = answer;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return null;

  let scaleMax = rubricLevels > 1 ? rubricLevels - 1 : 1;
  if (answer.legend) {
    const legendIndices = Object.keys(answer.legend)
      .map((key) => Number(key))
      .filter((n) => Number.isFinite(n));
    if (legendIndices.length > 0) {
      const legendMax = Math.max(...legendIndices);
      if (legendMax > 0) scaleMax = legendMax;
    }
  }

  const clampedScore = Math.min(Math.max(score, 0), scaleMax);
  const value = Math.min(100, Math.max(0, Math.round((clampedScore / scaleMax) * 100)));
  const clampedConfidence = Math.min(1, Math.max(0, confidence));
  return { value, confidence: clampedConfidence };
}

function extractBestRouteAlias(answers: Record<string, JevAnswer>): string | null {
  const answer = answers[BEST_ROUTE_QUESTION_ID];
  if (!answer || typeof answer.choice !== 'string') return null;
  return answer.choice;
}

function mapAnswersToAdvice(
  response: JevDecisionsResponse,
  routes: RouteCandidate[],
  aliasByRouteId: Map<string, string>,
  minFactorConfidence: number,
): RouteAdvice[] {
  const answers = response.answers;
  const bestAlias = extractBestRouteAlias(answers);
  const advice: RouteAdvice[] = [];

  for (const route of routes) {
    const alias = aliasByRouteId.get(route.routeId);
    if (!alias) continue;

    const factors: Partial<RouteFactors> = {};
    const confidences: number[] = [];
    let complete = true;

    for (const factor of JUDGMENT_FACTORS) {
      const rubricLevels = FACTOR_DEFINITIONS[factor].criteria.length;
      const normalized = normalizeScoreAnswer(answers[questionId(alias, factor)], rubricLevels);
      if (!normalized) {
        complete = false;
        break;
      }
      // Gate per factor: one uncertain judgment should not discard the confident ones,
      // and must not be passed on either.
      if (normalized.confidence < minFactorConfidence) continue;
      factors[factor as RouteFactorKey] = normalized.value;
      confidences.push(normalized.confidence);
    }

    if (!complete || confidences.length === 0) continue;

    advice.push({
      routeId: route.routeId,
      factors,
      // Mean over the factors that passed the gate, so the scorer's route-level threshold
      // reflects the advice actually being handed over.
      confidence: confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
      rationale: alias === bestAlias ? 'Jev ranked this route highest among the candidates considered.' : undefined,
    });
  }

  return advice;
}

export interface JevQueryResult {
  response: JevDecisionsResponse;
  aliasByRouteId: Map<string, string>;
}

/**
 * Performs the raw Decisions API call and returns the validated response alongside the
 * route-id/alias mapping used to build it — or null on any failure (never throws). Exported
 * mainly so the manual probe script (scripts/jev-probe.ts) can also print `usage.cost`, which
 * `JevAdvisor.advise` intentionally does not surface as part of the RouteAdvisor contract.
 */
export async function queryJevDecisions(
  options: JevAdvisorOptions,
  input: AdvisorInput,
): Promise<JevQueryResult | null> {
  if (input.routes.length === 0) return null;

  const model = options.model ?? DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const fetchImpl = options.fetch ?? fetch;

  try {
    const aliasByRouteId = buildRouteAliases(input.routes);
    const state = buildState(input, aliasByRouteId);
    const questions = buildQuestions(input.routes, aliasByRouteId);

    const body = JSON.stringify({ model, state, questions });

    let res: Response;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return null;
    }

    if (!res.ok) return null;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return null;
    }

    const parsed = decisionsResponseSchema.safeParse(json);
    if (!parsed.success) return null;

    return { response: parsed.data, aliasByRouteId };
  } catch {
    return null;
  }
}

export class JevAdvisor implements RouteAdvisor {
  readonly name = 'jev' as const;

  constructor(private readonly options: JevAdvisorOptions) {}

  async advise(input: AdvisorInput): Promise<RouteAdvice[]> {
    if (input.routes.length === 0) return [];
    try {
      const result = await queryJevDecisions(this.options, input);
      if (!result) return [];
      return mapAnswersToAdvice(
        result.response,
        input.routes,
        result.aliasByRouteId,
        this.options.minFactorConfidence ?? DEFAULT_ADVISOR_MIN_CONFIDENCE,
      );
    } catch {
      return [];
    }
  }
}

/** Minimal shape of the env config this factory needs (kept structural to avoid a hard
 *  dependency on the full AppConfig type, and to make testing easy). */
export interface JevEnvConfig {
  OPENROUTER_API_KEY?: string;
  JEV_ENABLED?: 'true' | 'false';
  JEV_MODEL?: string;
  JEV_TIMEOUT_MS?: number;
  JEV_MIN_CONFIDENCE?: number;
}

export function createRouteAdvisorFromEnv(config: JevEnvConfig): JevAdvisor | null {
  if (!config.OPENROUTER_API_KEY) return null;
  if (config.JEV_ENABLED === 'false') return null;
  return new JevAdvisor({
    apiKey: config.OPENROUTER_API_KEY,
    model: config.JEV_MODEL,
    timeoutMs: config.JEV_TIMEOUT_MS,
    minFactorConfidence: config.JEV_MIN_CONFIDENCE,
  });
}
