import { describe, expect, it } from 'vitest';
import { compareDays } from './compare-days';
import { daySlots, localParts, meetingFits, parsePlan, utcOffset } from './time';
import type { Plan } from './time';

const plan: Plan = { date: '2026-09-20', places: [{ zone: 'America/Toronto', start: 540, end: 1080 }], duration: 60, index: 44, weekdays: true };

describe('seven-day comparison', () => {
  it('includes the current day, keeps closed weekends and does not mutate the plan', () => {
    const original = structuredClone(plan);
    const days = compareDays(plan);
    expect(days.map(day => day.date)).toEqual(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26']);
    expect(days.map(day => day.starts)).toEqual([0, 33, 33, 33, 33, 33, 0]);
    expect(days[0].suggested).toBeNull();
    expect(plan).toEqual(original);
  });
  it('finds the shared working days of cities with different workweeks', () => {
    const mixed = { ...plan, places: [
      { ...plan.places[0], days: [0, 1, 2, 3, 4] },
      { zone: 'Europe/London', start: 540, end: 1080, days: [1, 2, 3, 4, 5] },
    ] };
    expect(compareDays(mixed).map(day => day.starts)).toEqual([0, 13, 13, 13, 13, 0, 0]);
    for (const day of compareDays(mixed)) {
      if (!day.suggested) continue;
      const { instant, index } = day.suggested;
      expect(daySlots(day.date, mixed.places[0].zone)[index]).toBe(instant);
      expect(localParts(instant, mixed.places[0].zone).date).toBe(day.date);
      expect(mixed.places.every(place => meetingFits(instant, place, mixed.duration, mixed.weekdays))).toBe(true);
      expect(parsePlan(JSON.stringify({ ...mixed, date: day.date, index }))).not.toBeNull();
    }
  });
  it('checks the full duration through overnight windows', () => {
    const night = { ...plan, places: [{ zone: 'UTC', start: 1380, end: 60, days: [0] }] };
    expect(compareDays(night).map(day => day.starts)).toEqual([4, 1, 0, 0, 0, 0, 0]);
    const longer = { ...night, duration: 120 };
    expect(compareDays(longer).map(day => day.starts)).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });
  it.each([
    ['2026-03-07', 'America/Toronto', 92],
    ['2026-10-31', 'America/Toronto', 100],
    ['2026-04-04', 'Australia/Lord_Howe', 98],
  ])('uses actual day lengths across the transition after %s in %s', (date, zone, starts) => {
    const days = compareDays({ ...plan, date, weekdays: false, places: [{ zone, start: 0, end: 0 }] });
    expect(days).toHaveLength(7);
    expect(days[1].starts).toBe(starts);
    expect(new Set(days.map(day => day.date)).size).toBe(7);
    for (const day of days) {
      expect(daySlots(day.date, zone)[day.suggested!.index]).toBe(day.suggested!.instant);
    }
  });
  it('preserves a suggested repeated-hour instant and its UTC offset', () => {
    const [day] = compareDays({ ...plan, date: '2026-11-01', duration: 30, weekdays: false,
      places: [{ zone: 'America/Toronto', start: 60, end: 120, days: [0] }] });
    expect(day.starts).toBe(7);
    expect(day.suggested!.instant).toBe(Date.parse('2026-11-01T05:30:00Z'));
    expect(utcOffset(day.suggested!.instant, 'America/Toronto')).toBe('UTC-4');
  });
  it('shows Samoa’s skipped date as unavailable without inventing a selection', () => {
    const days = compareDays({ ...plan, date: '2011-12-29', weekdays: false,
      places: [{ zone: 'Pacific/Apia', start: 0, end: 0 }] });
    expect(days[1]).toEqual({ date: '2011-12-30', exists: false, starts: 0, suggested: null });
    expect(days[2].date).toBe('2011-12-31');
    expect(days[2].starts).toBe(96);
  });
  it('stops at the supported date boundary and handles an entirely closed week', () => {
    const closed = { ...plan, date: '2099-12-30', places: [{ ...plan.places[0], days: [] }] };
    expect(compareDays(closed).map(day => day.date)).toEqual(['2099-12-30', '2099-12-31']);
    expect(compareDays(closed).every(day => day.starts === 0 && day.suggested === null)).toBe(true);
    expect(compareDays({ ...plan, date: '2100-01-01' })).toEqual([]);
  });
});
