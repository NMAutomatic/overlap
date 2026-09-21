import { available, STEP } from './time';
import type { Plan } from './time';

export type Compromise = {
  instant: number;
  fittingCities: number;
  outside: { cityIndex: number; minutes: number }[];
  worstOutside: number;
  totalOutside: number;
};

/** Partial matches only: never present these as a replacement for a full match. */
export function compromiseSlots(slots: number[], plan: Plan): Compromise[] {
  const checks = plan.places.map(() => new Map<number, boolean>());
  const candidates: Compromise[] = [];
  for (const instant of slots) {
    const outside: Compromise['outside'] = [];
    plan.places.forEach((place, cityIndex) => {
      let minutes = 0;
      for (let offset = 0; offset < plan.duration; offset += 15) {
        const t = instant + offset * 60_000;
        let fits = checks[cityIndex].get(t);
        if (fits === undefined) {
          fits = available(t, place, plan.weekdays);
          checks[cityIndex].set(t, fits);
        }
        if (!fits) minutes += 15;
      }
      if (minutes) outside.push({ cityIndex, minutes });
    });
    // A complete match anywhere in this range makes compromise suggestions unnecessary.
    if (!outside.length) return [];
    const fittingCities = plan.places.length - outside.length;
    if (!fittingCities) continue;
    candidates.push({ instant, fittingCities, outside,
      worstOutside: Math.max(...outside.map(entry => entry.minutes)),
      totalOutside: outside.reduce((total, entry) => total + entry.minutes, 0) });
  }
  candidates.sort((a, b) => b.fittingCities - a.fittingCities || a.worstOutside - b.worstOutside
    || a.totalOutside - b.totalOutside || a.instant - b.instant);
  const result: Compromise[] = [];
  for (const candidate of candidates) {
    if (result.every(other => Math.abs(other.instant - candidate.instant) >= 2 * STEP)) result.push(candidate);
    if (result.length === 3) break;
  }
  return result;
}
