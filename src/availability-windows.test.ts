import { describe, expect, it } from 'vitest';
import { available, daySlots, matchingSlots, meetingFits, parsePlan, recommend, restoreSavedPlan } from './time';
import { compareDays } from './compare-days';
import { compromiseSlots } from './compromise';
import { readSavedPlans, saveNamedPlan } from './saved-plans';
import { meetingSummary } from './meeting-summary';
import type { Place, Plan } from './time';

const place: Place = { zone: 'UTC', start: 540, end: 720, extra: [{ start: 780, end: 1020 }] };
const plan: Plan = { date: '2026-09-21', places: [place], index: 46, duration: 60, weekdays: false };
const at = Date.parse;

describe('multiple daily windows', () => {
  it('keeps lunch unavailable and requires the full meeting to avoid the gap', () => {
    expect(available(at('2026-09-21T11:45:00Z'), place)).toBe(true);
    expect(available(at('2026-09-21T12:00:00Z'), place)).toBe(false);
    expect(available(at('2026-09-21T13:00:00Z'), place)).toBe(true);
    expect(meetingFits(at('2026-09-21T11:30:00Z'), place, 60)).toBe(false);
    expect(matchingSlots(daySlots(plan.date, 'UTC'), plan)).toHaveLength(22);
  });
  it('combines adjacent and overlapping windows without double-counting starts', () => {
    const adjacent = { ...place, extra: [{ start: 720, end: 1020 }] };
    expect(meetingFits(at('2026-09-21T11:30:00Z'), adjacent, 120)).toBe(true);
    const overlap = { ...place, extra: [{ start: 660, end: 1020 }, { start: 780, end: 900 }] };
    const slots = daySlots(plan.date, 'UTC');
    const expected = matchingSlots(slots, { ...plan, places: [{ zone: 'UTC', start: 540, end: 1020 }] });
    expect(matchingSlots(slots, { ...plan, places: [adjacent] })).toEqual(expected);
    expect(matchingSlots(slots, { ...plan, places: [overlap] })).toEqual(expected);
  });
  it('uses the starting weekday separately for each overnight window', () => {
    const friday = { zone: 'UTC', start: 540, end: 720, extra: [{ start: 1320, end: 120 }], days: [5] };
    expect(available(at('2026-09-25T10:00:00Z'), friday)).toBe(true);
    expect(meetingFits(at('2026-09-26T01:00:00Z'), friday, 60)).toBe(true);
    expect(available(at('2026-09-26T02:00:00Z'), friday)).toBe(false);
    expect(available(at('2026-09-26T10:00:00Z'), friday)).toBe(false);
    expect(available(at('2026-09-27T01:00:00Z'), friday)).toBe(false);
  });
  it('treats equal times in any window as all-day, still respecting selected days', () => {
    const allDay = { ...place, extra: [{ start: 780, end: 780 }], days: [1] };
    expect(available(at('2026-09-21T12:30:00Z'), allDay)).toBe(true);
    expect(available(at('2026-09-22T12:30:00Z'), allDay)).toBe(false);
  });
  it('checks gaps in both occurrences of a repeated DST hour', () => {
    const repeated = { zone: 'America/Toronto', start: 0, end: 60, extra: [{ start: 90, end: 120 }] };
    expect(available(at('2026-11-01T05:15:00Z'), repeated)).toBe(false);
    expect(available(at('2026-11-01T06:15:00Z'), repeated)).toBe(false);
    expect(meetingFits(at('2026-11-01T05:45:00Z'), repeated, 30)).toBe(false);
    repeated.extra[0].start = 60;
    expect(meetingFits(at('2026-11-01T05:45:00Z'), repeated, 30)).toBe(true);
  });
  it('ranks both window midpoints and applies the same gaps in comparisons and exports', () => {
    const slots = daySlots(plan.date, 'UTC');
    const matches = matchingSlots(slots, plan);
    expect(recommend(matches, plan.places).slice(0, 2)).toEqual(['2026-09-21T10:30:00Z', '2026-09-21T15:00:00Z'].map(at));
    expect(compareDays(plan).map(day => day.starts)).toEqual([22, 22, 22, 22, 22, 22, 22]);
    expect(meetingSummary(plan)).toContain('Outside available hours');
    const twoCities = { ...plan, places: [place, { zone: 'Europe/London', start: 0, end: 0 }] };
    expect(compromiseSlots([at('2026-09-21T11:30:00Z')], twoCities)[0].outside).toEqual([{ cityIndex: 0, minutes: 30 }]);
  });
});

describe('multi-window persistence', () => {
  it('round-trips additional windows in shares, local preferences and named snapshots', () => {
    expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
    expect(restoreSavedPlan(JSON.stringify(plan), at('2026-09-22T10:00:00Z'))?.places).toEqual(plan.places);
    let value: string | null = null;
    const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
    const copy = structuredClone(plan);
    saveNamedPlan(storage, 'Split shifts', copy);
    copy.places[0].extra![0].start = 840;
    expect(readSavedPlans(storage)[0].plan).toEqual(plan);
  });
  it('preserves legacy single-window plans and omits empty or unrelated fields', () => {
    const legacy = { ...plan, places: [{ zone: 'UTC', start: 540, end: 1020 }] };
    expect(parsePlan(JSON.stringify(legacy))).toEqual(legacy);
    expect(parsePlan(JSON.stringify({ ...legacy, places: [{ ...legacy.places[0], extra: [] }] }))).toEqual(legacy);
    expect(parsePlan(JSON.stringify({ ...plan, places: [{ ...place, extra: [{ start: 780, end: 1020, unrelated: 'ignored' }] }] }))).toEqual(plan);
  });
  it.each([null, 'invalid', [null], [{ start: 780 }], [{ start: 780, end: 1440 }], [{ start: 781, end: 1020 }], [{ start: '780', end: 1020 }], Array(3).fill({ start: 780, end: 1020 })])('rejects malformed or excessive windows: %j', extra => {
    expect(parsePlan(JSON.stringify({ ...plan, places: [{ ...place, extra }] }))).toBeNull();
  });
});
