import { describe, expect, it } from 'vitest';
import { daySlots, localParts, parsePlan, setPlanBase, utcOffset } from './time';
import type { Plan } from './time';

function fixture(instant: string, zones: string[]): Plan {
  const time = Date.parse(instant);
  const date = localParts(time, zones[0]).date;
  return { date, index: daySlots(date, zones[0]).indexOf(time), duration: 60, weekdays: true,
    places: zones.map(zone => ({ zone, start: 540, end: 720, extra: [{ start: 780, end: 1020 }], days: [1, 3, 5] })) };
}
const instantOf = (plan: Plan) => daySlots(plan.date, plan.places[0].zone)[plan.index];

describe('changing the base city', () => {
  it('preserves the instant, all availability and the relative order of other cities', () => {
    const original = fixture('2026-09-21T03:00:00Z', ['America/Toronto', 'Europe/London', 'Asia/Tokyo']);
    const before = structuredClone(original);
    const changed = setPlanBase(original, 2)!;
    expect(changed.date).toBe('2026-09-21');
    expect(original.date).toBe('2026-09-20');
    expect(changed.places).toEqual([original.places[2], original.places[0], original.places[1]]);
    expect(instantOf(changed)).toBe(Date.parse('2026-09-21T03:00:00Z'));
    expect(changed.duration).toBe(60);
    expect(changed.weekdays).toBe(true);
    expect(parsePlan(JSON.stringify(changed))).toEqual(changed);
    expect(original).toEqual(before);
    expect(setPlanBase(changed, 1)).toEqual({ ...original, places: [original.places[0], original.places[2], original.places[1]] });
  });
  it.each([
    ['2026-11-01T05:30:00Z', 'UTC-4'], ['2026-11-01T06:30:00Z', 'UTC-5'],
  ])('keeps the exact occurrence of repeated local time: %s', (instant, offset) => {
    const changed = setPlanBase(fixture(instant, ['UTC', 'America/New_York']), 1)!;
    expect(instantOf(changed)).toBe(Date.parse(instant));
    expect(localParts(instantOf(changed), changed.places[0].zone).time).toBe('01:30');
    expect(utcOffset(instantOf(changed), changed.places[0].zone)).toBe(offset);
  });
  it('uses the new local date when the old label does not exist there', () => {
    const changed = setPlanBase(fixture('2011-12-30T12:00:00Z', ['UTC', 'Pacific/Apia']), 1)!;
    expect(changed.date).toBe('2011-12-31');
    expect(instantOf(changed)).toBe(Date.parse('2011-12-30T12:00:00Z'));
  });
  it('rejects an unsupported new local date without changing the original plan', () => {
    for (const [instant, zone] of [['2000-01-01T00:00:00Z', 'America/Los_Angeles'], ['2099-12-31T23:00:00Z', 'Pacific/Kiritimati']]) {
      const original = fixture(instant, ['UTC', zone]);
      const copy = structuredClone(original);
      expect(setPlanBase(original, 1)).toBeNull();
      expect(original).toEqual(copy);
    }
  });
  it('leaves the existing base alone and rejects invalid indices', () => {
    const plan = fixture('2026-09-21T03:00:00Z', ['UTC', 'Asia/Tokyo']);
    expect(setPlanBase(plan, 0)).toEqual(plan);
    for (const index of [-1, 2, 0.5, NaN]) expect(setPlanBase(plan, index)).toBeNull();
  });
});
