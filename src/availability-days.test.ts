import { describe, expect, it } from 'vitest';
import { availabilityDays, available, daySlots, matchingSlots, meetingFits, parsePlan, restoreSavedPlan } from './time';
import type { Place, Plan } from './time';

const toronto: Place = { zone: 'America/Toronto', start: 540, end: 1080 };
const plan: Plan = { date: '2026-09-20', places: [toronto], duration: 60, index: 44, weekdays: true };
const at = Date.parse;

describe('per-city available days', () => {
  it('preserves legacy defaults while allowing an explicit Sunday–Thursday workweek', () => {
    const custom = { ...toronto, days: [0, 1, 2, 3, 4] };
    expect(available(at('2026-09-20T15:00:00Z'), toronto, true)).toBe(false);
    expect(available(at('2026-09-20T15:00:00Z'), toronto, false)).toBe(true);
    expect(available(at('2026-09-20T15:00:00Z'), custom, true)).toBe(true);
    expect(available(at('2026-09-25T15:00:00Z'), custom, false)).toBe(false);
    expect(availabilityDays(toronto, true)).toEqual([1, 2, 3, 4, 5]);
  });
  it('uses each city’s own date rather than the reference city’s weekday', () => {
    const instant = at('2026-09-21T00:00:00Z');
    expect(available(instant, { ...toronto, start: 0, end: 0, days: [0] })).toBe(true);
    expect(available(instant, { zone: 'Asia/Tokyo', start: 0, end: 0, days: [0] })).toBe(false);
    expect(available(instant, { zone: 'Asia/Tokyo', start: 0, end: 0, days: [1] })).toBe(true);
  });
  it('keeps Friday’s overnight window available on Saturday, but closes at its end', () => {
    const night = { ...toronto, start: 1320, end: 120, days: [5] };
    expect(available(at('2026-09-26T05:30:00Z'), night)).toBe(true);
    expect(meetingFits(at('2026-09-26T05:30:00Z'), night, 30)).toBe(true);
    expect(meetingFits(at('2026-09-26T05:30:00Z'), night, 45)).toBe(false);
    expect(available(at('2026-09-27T05:30:00Z'), night)).toBe(false);
  });
  it('checks a full meeting that crosses from an all-day Sunday into a closed Monday', () => {
    const sunday = { ...toronto, start: 0, end: 0, days: [0] };
    expect(meetingFits(at('2026-09-21T03:30:00Z'), sunday, 30)).toBe(true);
    expect(meetingFits(at('2026-09-21T03:30:00Z'), sunday, 60)).toBe(false);
  });
  it('includes both occurrences of a selected weekday’s repeated DST hour', () => {
    const sunday = { ...toronto, start: 60, end: 120, days: [0] };
    for (const instant of ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z']) {
      expect(meetingFits(at(instant), sunday, 30, true)).toBe(true);
    }
    expect(available(at('2026-11-01T07:00:00Z'), sunday, true)).toBe(false);
  });
  it('allows a city to have no available days and recomputes after changes', () => {
    const custom: Plan = { ...plan, places: [{ ...toronto, days: [] }] };
    const slots = daySlots(custom.date, toronto.zone);
    expect(matchingSlots(slots, custom)).toEqual([]);
    custom.places[0].days = [0];
    expect(matchingSlots(slots, custom)).toHaveLength(33);
    custom.places[0].days = [1];
    expect(matchingSlots(slots, custom)).toEqual([]);
  });
  it('requires every city’s full window even with different workweeks', () => {
    const sunday = { ...toronto, days: [0, 1, 2, 3, 4] };
    const london = { zone: 'Europe/London', start: 540, end: 1080 };
    const slots = daySlots(plan.date, toronto.zone);
    const mixed = { ...plan, places: [sunday, london] };
    expect(matchingSlots(slots, mixed)).toEqual([]);
    expect(matchingSlots(slots, { ...mixed, places: [sunday, { ...london, days: [0] }] })).toHaveLength(13);
  });
});

describe('available-day persistence and share validation', () => {
  it('round-trips custom and empty day lists, preserving legacy inherited defaults', () => {
    expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
    const custom = { ...plan, places: [{ ...toronto, days: [0, 1, 2, 3, 4] }, { zone: 'UTC', start: 0, end: 0, days: [] }] };
    expect(parsePlan(JSON.stringify(custom))).toEqual(custom);
    expect(restoreSavedPlan(JSON.stringify(custom), at('2026-09-21T15:00:00Z'))?.places).toEqual(custom.places);
  });
  it.each([null, 'Monday', [1, 1], [-1], [7], [1.5], ['1'], [true], {}])('rejects invalid day data: %j', days => {
    expect(parsePlan(JSON.stringify({ ...plan, places: [{ ...toronto, days }] }))).toBeNull();
  });
});
