import { describe, expect, it } from 'vitest';
import { compromiseSlots } from './compromise';
import { daySlots, localParts, meetingFits, utcOffset } from './time';
import type { Plan } from './time';

const plan: Plan = { date: '2026-09-21', index: 36, duration: 60, weekdays: false, places: [
  { zone: 'UTC', start: 540, end: 600 },
  { zone: 'Europe/London', start: 630, end: 690 },
] };
const at = Date.parse;

describe('explicit compromise suggestions', () => {
  it('shows both sides of a half-hour conflict with exact per-city costs', () => {
    const result = compromiseSlots(daySlots(plan.date, 'UTC'), plan);
    expect(result.map(entry => entry.instant)).toEqual([at('2026-09-21T09:00:00Z'), at('2026-09-21T09:30:00Z')]);
    expect(result.map(entry => entry.outside)).toEqual([[{ cityIndex: 1, minutes: 30 }], [{ cityIndex: 0, minutes: 30 }]]);
    expect(result.every(entry => entry.fittingCities === 1 && entry.worstOutside === 30 && entry.totalOutside === 30)).toBe(true);
  });
  it('prefers keeping more cities fully within hours', () => {
    const three = { ...plan, places: [...plan.places, { zone: 'Africa/Abidjan', start: 570, end: 630 }] };
    const [best] = compromiseSlots(daySlots(plan.date, 'UTC'), three);
    expect(best.instant).toBe(at('2026-09-21T09:30:00Z'));
    expect(best.fittingCities).toBe(2);
    expect(best.outside).toEqual([{ cityIndex: 0, minutes: 30 }]);
  });
  it('breaks equal-city ties by the worst individual cost before total cost', () => {
    const balanced = { ...plan, places: [
      { zone: 'UTC', start: 0, end: 0 },
      { zone: 'Africa/Abidjan', start: 555, end: 630 },
      { zone: 'Atlantic/Reykjavik', start: 585, end: 630 },
    ] };
    const result = compromiseSlots([at('2026-09-21T09:00:00Z'), at('2026-09-21T10:00:00Z')], balanced);
    expect(result.map(entry => entry.worstOutside)).toEqual([30, 45]);
    expect(result.map(entry => entry.totalOutside)).toEqual([60, 60]);
  });
  it('does not show compromises if a complete match exists or no city can fit', () => {
    const slots = daySlots(plan.date, 'UTC');
    expect(compromiseSlots(slots, { ...plan, duration: 30 })).toEqual([]);
    expect(compromiseSlots(slots, { ...plan, places: plan.places.map(p => ({ ...p, days: [] })) })).toEqual([]);
    expect(compromiseSlots([], plan)).toEqual([]);
  });
  it('counts closed local weekdays and overnight ownership across midnight', () => {
    const night = { ...plan, date: '2026-09-26', places: [
      { zone: 'America/Toronto', start: 1320, end: 120, days: [5] },
      { zone: 'Asia/Tokyo', start: 0, end: 0, days: [1] },
    ] };
    const [result] = compromiseSlots([at('2026-09-26T05:00:00Z')], night);
    expect(result.fittingCities).toBe(1);
    expect(result.outside).toEqual([{ cityIndex: 1, minutes: 60 }]);
    expect(compromiseSlots([at('2026-09-26T05:30:00Z')], night)).toEqual([]);
  });
  it('keeps repeated-hour instants distinct and counts elapsed minutes through DST', () => {
    const repeated = { ...plan, date: '2026-11-01', places: [
      { zone: 'America/Toronto', start: 60, end: 120 },
      { zone: 'UTC', start: 330, end: 390 },
    ] };
    const result = compromiseSlots([at('2026-11-01T05:00:00Z'), at('2026-11-01T06:00:00Z')], repeated);
    expect(result).toHaveLength(2);
    expect(result.map(entry => localParts(entry.instant, 'America/Toronto').time)).toEqual(['01:00', '01:00']);
    expect(result.map(entry => utcOffset(entry.instant, 'America/Toronto'))).toEqual(['UTC-4', 'UTC-5']);
    expect(result.map(entry => entry.totalOutside)).toEqual([30, 30]);
  });
  it('returns at most three distinct starts and recomputes when settings change', () => {
    const original = structuredClone(plan);
    const wide = { ...plan, places: [{ ...plan.places[0], start: 0, end: 0 }, { ...plan.places[1], days: [] }] };
    const slots = daySlots(plan.date, 'UTC');
    const result = compromiseSlots(slots, wide);
    expect(result).toHaveLength(3);
    for (let i = 1; i < result.length; i++) expect(Math.abs(result[i].instant - result[i - 1].instant)).toBeGreaterThanOrEqual(30 * 60_000);
    for (const candidate of result) {
      expect(candidate.fittingCities).toBe(wide.places.filter(p => meetingFits(candidate.instant, p, wide.duration)).length);
    }
    wide.places[1] = { zone: 'Europe/London', start: 0, end: 0 };
    expect(compromiseSlots(slots, wide)).toEqual([]);
    expect(plan).toEqual(original);
  });
});
