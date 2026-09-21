import { describe, expect, it } from 'vitest';
import { daySlots, matchingSlots, recommend } from './time';
import type { Place, Plan } from './time';

const at = Date.parse;
const plan: Plan = { date: '2026-09-21', places: [{ zone: 'UTC', start: 540, end: 1020 }], duration: 60, index: 0, weekdays: false };
const picks = (value: Plan) => recommend(matchingSlots(daySlots(value.date, value.places[0].zone), value), value.places);

describe('recommendation ranking', () => {
  it('prefers the window midpoint, breaking equal scores by the earlier instant', () => {
    expect(picks(plan)).toEqual(['2026-09-21T13:00:00Z', '2026-09-21T12:00:00Z', '2026-09-21T14:00:00Z'].map(at));
  });
  it('finds the midpoint across midnight rather than midday', () => {
    const night = { ...plan, places: [{ zone: 'UTC', start: 1320, end: 360 }] };
    expect(picks(night)).toEqual(['2026-09-21T02:00:00Z', '2026-09-21T01:00:00Z', '2026-09-21T03:00:00Z'].map(at));
  });
  it('keeps both repeated-hour instants when they are an elapsed hour apart', () => {
    const repeated = { ...plan, date: '2026-11-01', duration: 30, places: [{ zone: 'America/Toronto', start: 60, end: 120 }] };
    expect(picks(repeated)).toEqual(['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z'].map(at));
  });
  it('does not mutate inputs, duplicate recommendations or depend on candidate ordering', () => {
    const candidates = ['2026-09-21T14:00:00Z', '2026-09-21T12:00:00Z', '2026-09-21T13:00:00Z', '2026-09-21T13:00:00Z'].map(at);
    const original = [...candidates];
    expect(recommend(candidates, plan.places)).toEqual(['2026-09-21T13:00:00Z', '2026-09-21T12:00:00Z', '2026-09-21T14:00:00Z'].map(at));
    expect(candidates).toEqual(original);
    expect(recommend([], plan.places)).toEqual([]);
  });
  it('recalculates rankings when availability changes, including all-day windows', () => {
    const places: Place[] = [{ zone: 'UTC', start: 0, end: 0 }];
    const candidates = daySlots(plan.date, 'UTC');
    expect(recommend(candidates, places)[0]).toBe(at('2026-09-21T12:00:00Z'));
    places[0].start = 1320; places[0].end = 360;
    expect(recommend(candidates, places)[0]).toBe(at('2026-09-21T02:00:00Z'));
  });
});
