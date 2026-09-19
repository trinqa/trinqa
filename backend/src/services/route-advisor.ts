import type { AdvisorInput, RouteAdvice, RouteAdvisor } from '../domain/route.js';

/**
 * Default advisor used until a real judgment layer (Jev) is wired in. It always resolves
 * to no advice, which makes `decideRoute` fall back to purely deterministic scoring with
 * `advisor.fallbackReason === 'disabled'`.
 */
export class NoopAdvisor implements RouteAdvisor {
  readonly name = 'none' as const;

  async advise(_input: AdvisorInput): Promise<RouteAdvice[]> {
    return [];
  }
}
