import { daySlots, matchingSlots, recommend, validDate } from './time';
import type { Plan } from './time';

export type ComparedDay = {
  date: string;
  exists: boolean;
  starts: number;
  suggested: { instant: number; index: number } | null;
};

/** Compare seven local calendar dates, including the selected date, without editing the plan. */
export function compareDays(plan: Plan): ComparedDay[] {
  if (!validDate(plan.date)) return [];
  const first = Date.parse(`${plan.date}T12:00:00Z`);
  const result: ComparedDay[] = [];
  for (let offset = 0; offset < 7; offset++) {
    // Advance calendar labels in UTC, then enumerate each date in the reference zone.
    // Adding 24 hours to a reference-zone instant would skip/repeat dates around DST.
    const date = new Date(first + offset * 86_400_000).toISOString().slice(0, 10);
    if (!validDate(date)) break;
    const slots = daySlots(date, plan.places[0].zone);
    const matches = matchingSlots(slots, { ...plan, date });
    const instant = recommend(matches, plan.places)[0];
    result.push({ date, exists: slots.length > 0, starts: matches.length,
      suggested: instant === undefined ? null : { instant, index: slots.indexOf(instant) } });
  }
  return result;
}
