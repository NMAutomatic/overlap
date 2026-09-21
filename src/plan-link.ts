import { parsePlan, restoreSavedPlan } from './time';
import type { Plan } from './time';

export type PlanLink = { kind: 'none' | 'invalid' } | { kind: 'valid'; plan: Plan };

/** Distinguish a missing share from a broken one instead of silently replacing it. */
export function readPlanLink(hash: string): PlanLink {
  if (!hash || hash === '#' || hash === '#planner') return { kind: 'none' };
  try {
    const plan = parsePlan(decodeURIComponent(hash.slice(1)));
    return plan ? { kind: 'valid', plan } : { kind: 'invalid' };
  } catch { return { kind: 'invalid' }; }
}

export function loadInitialPlan(hash: string, readSaved: () => string | null, starter: () => Plan, now = Date.now()) {
  const shared = readPlanLink(hash);
  if (shared.kind === 'valid') return { plan: shared.plan, source: 'shared' as const, invalidLink: false };
  const invalidLink = shared.kind === 'invalid';
  try {
    const saved = restoreSavedPlan(readSaved() || '', now);
    if (saved) return { plan: saved, source: 'saved' as const, invalidLink };
  } catch { /* Optional storage may be unavailable. Never write during recovery. */ }
  return { plan: starter(), source: 'starter' as const, invalidLink };
}
