import { describe, expect, it } from 'vitest';
import { available, calendarFile, daySlots, localParts, matchingSlots, meetingFits, movePlanDate, neighboringDate, parsePlan, recommend, removePlanPlace, restoreSavedPlan, STEP, utcOffset } from './time';
import type { Place, Plan } from './time';
const toronto: Place = { zone: 'America/Toronto', start: 540, end: 1020 };
const base: Plan = { date: '2026-09-14', places: [toronto], duration: 60, index: 0, weekdays: false };

describe('removing cities', () => {
  const place = (zone: string): Place => ({ zone, start: 540, end: 1080 });
  const at = (instant: string, zones: string[]): Plan => {
    const time = Date.parse(instant);
    const date = localParts(time, zones[0]).date;
    return { ...base, date, places: zones.map(place), index: daySlots(date, zones[0]).indexOf(time) };
  };
  it('preserves the UTC instant when the new base is on another local date', () => {
    const original = at('2026-09-21T03:00:00Z', ['America/Toronto', 'Asia/Tokyo']);
    const updated = removePlanPlace(original, 0)!;
    expect(original.date).toBe('2026-09-20');
    expect(updated.date).toBe('2026-09-21');
    expect(daySlots(updated.date, updated.places[0].zone)[updated.index]).toBe(Date.parse('2026-09-21T03:00:00Z'));
    expect(localParts(daySlots(updated.date, updated.places[0].zone)[updated.index], 'Asia/Tokyo').time).toBe('12:00');
    expect(original.places).toHaveLength(2);
  });
  it('keeps the second occurrence of a repeated hour', () => {
    const updated = removePlanPlace(at('2026-11-01T06:30:00Z', ['UTC', 'America/New_York']), 0)!;
    const instant = daySlots(updated.date, 'America/New_York')[updated.index];
    expect(instant).toBe(Date.parse('2026-11-01T06:30:00Z'));
    expect(utcOffset(instant, 'America/New_York')).toBe('UTC-5');
  });
  it('uses the actual local date even when the old date was skipped in the new base', () => {
    const updated = removePlanPlace(at('2011-12-30T12:00:00Z', ['UTC', 'Pacific/Apia']), 0)!;
    expect(updated.date).toBe('2011-12-31');
    expect(daySlots(updated.date, 'Pacific/Apia')[updated.index]).toBe(Date.parse('2011-12-30T12:00:00Z'));
  });
  it('leaves the date and selection alone when removing a non-base city', () => {
    const original = at('2026-09-21T03:00:00Z', ['America/Toronto', 'Asia/Tokyo', 'Europe/London']);
    expect(removePlanPlace(original, 1)).toEqual({ ...original, places: [original.places[0], original.places[2]] });
  });
  it('rejects empty plans, invalid indices and a new base outside supported dates', () => {
    expect(removePlanPlace(base, 0)).toBeNull();
    const original = at('2000-01-01T00:00:00Z', ['UTC', 'America/Los_Angeles']);
    expect(removePlanPlace(original, 0)).toBeNull();
    for (const index of [-1, 2, 0.5]) expect(removePlanPlace(original, index)).toBeNull();
  });
});

describe('planning date navigation', () => {
  it('crosses leap days and year boundaries without leaving the supported range', () => {
    expect(neighboringDate('2028-03-01', 'UTC', -1)).toBe('2028-02-29');
    expect(neighboringDate('2026-12-31', 'UTC', 1)).toBe('2027-01-01');
    expect(neighboringDate('2000-01-01', 'UTC', -1)).toBeNull();
    expect(neighboringDate('2099-12-31', 'UTC', 1)).toBeNull();
  });
  it('skips an entirely nonexistent local date in both directions', () => {
    expect(neighboringDate('2011-12-29', 'Pacific/Apia', 1)).toBe('2011-12-31');
    expect(neighboringDate('2011-12-31', 'Pacific/Apia', -1)).toBe('2011-12-29');
  });
  it('keeps 11:00 when the new day is an hour shorter', () => {
    const plan = { ...base, date: '2026-03-07', index: 44 };
    const moved = movePlanDate(plan, '2026-03-08')!;
    expect(moved.plan.index).toBe(40);
    expect(moved.timeAdjusted).toBe(false);
    expect(localParts(daySlots(moved.plan.date, toronto.zone)[moved.plan.index], toronto.zone).time).toBe('11:00');
    expect(plan.date).toBe('2026-03-07');
    expect(plan.index).toBe(44);
  });
  it('moves a nonexistent 02:30 to 03:00 and flags the adjustment', () => {
    const moved = movePlanDate({ ...base, date: '2026-03-07', index: 10 }, '2026-03-08')!;
    expect(moved.timeAdjusted).toBe(true);
    expect(localParts(daySlots(moved.plan.date, toronto.zone)[moved.plan.index], toronto.zone).time).toBe('03:00');
  });
  it('prefers the previous UTC offset when a wall-clock time repeats', () => {
    for (const [date, expected] of [['2026-10-31', '2026-11-01T05:30:00.000Z'], ['2026-11-02', '2026-11-01T06:30:00.000Z']]) {
      const moved = movePlanDate({ ...base, date, index: 6 }, '2026-11-01')!;
      expect(new Date(daySlots(moved.plan.date, toronto.zone)[moved.plan.index]).toISOString()).toBe(expected);
      expect(moved.timeAdjusted).toBe(false);
    }
  });
  it('rejects impossible target dates instead of creating an empty timeline', () => {
    expect(movePlanDate(base, '2026-02-30')).toBeNull();
    expect(movePlanDate({ ...base, places: [{ ...toronto, zone: 'Pacific/Apia' }] }, '2011-12-30')).toBeNull();
  });
});

describe('IANA day boundaries', () => {
  it('has 23 hours on spring-forward and no nonexistent 02:00', () => {
    const slots = daySlots('2026-03-08', toronto.zone);
    expect(slots).toHaveLength(92);
    expect(slots.some(t => localParts(t, toronto.zone).time.startsWith('02:'))).toBe(false);
  });
  it('preserves both occurrences of fall-back 01:00', () => {
    const slots = daySlots('2026-11-01', toronto.zone);
    expect(slots).toHaveLength(100);
    expect(slots.filter(t => localParts(t, toronto.zone).time === '01:00')).toHaveLength(2);
    expect(slots.every((t, i) => i === 0 || t - slots[i - 1] === STEP)).toBe(true);
  });
  it('supports quarter-hour offsets and date-line boundaries', () => {
    expect(localParts(Date.parse('2026-09-14T00:00Z'), 'Asia/Kathmandu').time).toBe('05:45');
    const slots = daySlots('2026-09-14', 'Pacific/Kiritimati');
    expect(new Date(slots[0]).toISOString()).toBe('2026-09-13T10:00:00.000Z');
    expect(slots).toHaveLength(96);
  });
  it('handles half-hour DST changes on Lord Howe Island', () => {
    expect(daySlots('2026-04-05', 'Australia/Lord_Howe')).toHaveLength(98);
    expect(daySlots('2026-10-04', 'Australia/Lord_Howe')).toHaveLength(94);
  });
  it('distinguishes repeated wall-clock times by their UTC offset', () => {
    const first = Date.parse('2026-11-01T05:30:00Z');
    const second = Date.parse('2026-11-01T06:30:00Z');
    expect(localParts(first, toronto.zone).time).toBe(localParts(second, toronto.zone).time);
    expect(utcOffset(first, toronto.zone)).toBe('UTC-4');
    expect(utcOffset(second, toronto.zone)).toBe('UTC-5');
  });
  it('rejects impossible dates', () => expect(daySlots('2026-02-30', 'UTC')).toEqual([]));
});

describe('availability', () => {
  it('checks the whole meeting with an exclusive window end', () => {
    expect(meetingFits(Date.parse('2026-09-14T20:00Z'), toronto, 60)).toBe(true);
    expect(meetingFits(Date.parse('2026-09-14T20:15Z'), toronto, 60)).toBe(false);
  });
  it('handles overnight windows and assigns early hours to the start day', () => {
    const p = { zone: 'UTC', start: 22 * 60, end: 6 * 60 };
    expect(available(Date.parse('2026-09-19T02:00Z'), p, true)).toBe(true);
    expect(available(Date.parse('2026-09-21T02:00Z'), p, true)).toBe(false);
    expect(available(Date.parse('2026-09-18T12:00Z'), p)).toBe(false);
  });
  it('checks a meeting across midnight in the next local day', () => {
    const p = { zone: 'UTC', start: 0, end: 0 };
    expect(meetingFits(Date.parse('2026-09-18T23:45Z'), p, 30, true)).toBe(false);
  });
  it('returns no false overlap and spreads recommendations', () => {
    const slots = daySlots(base.date, toronto.zone);
    const matches = matchingSlots(slots, base);
    expect(matches).toHaveLength(29);
    const picks = recommend(matches, base.places);
    expect(picks).toHaveLength(3);
    expect(picks.every(t => matches.includes(t))).toBe(true);
    const impossible = { ...base, places: [toronto, { zone: 'Asia/Tokyo', start: 540, end: 1020 }] };
    expect(matchingSlots(slots, impossible)).toHaveLength(0);
  });
});

describe('restoring local preferences', () => {
  const time = (plan: Plan) => localParts(daySlots(plan.date, plan.places[0].zone)[plan.index], plan.places[0].zone).time;
  it.each([
    ['2026-03-08', 40], // 11:00 on a 23-hour day
    ['2026-11-01', 48], // 11:00 on a 25-hour day
  ])('keeps the clock time when reopening a saved %s plan on a normal day', (date, index) => {
    const saved = { ...base, date, index, weekdays: true, duration: 90 };
    const restored = restoreSavedPlan(JSON.stringify(saved), Date.parse('2026-09-21T12:00:00Z'))!;
    expect(restored.date).toBe('2026-09-21');
    expect(time(restored)).toBe('11:00');
    expect(restored.duration).toBe(90);
    expect(restored.weekdays).toBe(true);
    expect(restored.places).toEqual(saved.places);
  });
  it('uses today in the base city, even when its calendar date differs from UTC', () => {
    const restored = restoreSavedPlan(JSON.stringify(base), Date.parse('2026-09-21T02:00:00Z'))!;
    expect(restored.date).toBe('2026-09-20');
  });
  it('moves a nonexistent saved clock time forward when today has a DST gap', () => {
    const saved = { ...base, date: '2026-03-07', index: 10 };
    const restored = restoreSavedPlan(JSON.stringify(saved), Date.parse('2026-03-08T12:00:00Z'))!;
    expect(time(restored)).toBe('03:00');
  });
  it('leaves shared plans on their explicit date and rejects malformed saved state', () => {
    expect(parsePlan(JSON.stringify(base))?.date).toBe(base.date);
    expect(restoreSavedPlan('not json')).toBeNull();
    expect(restoreSavedPlan(JSON.stringify(base), Date.parse('2100-01-02T12:00:00Z'))).toBeNull();
  });
});

describe('portable plans', () => {
  it.each([
    ['2026-09-14', 'America/Toronto', 96],
    ['2026-03-08', 'America/Toronto', 92],
    ['2026-11-01', 'America/Toronto', 100],
    ['2026-10-04', 'Australia/Lord_Howe', 94],
    ['2026-04-05', 'Australia/Lord_Howe', 98],
    ['2019-03-17', 'Antarctica/Casey', 108],
  ])('validates the selection against the actual day on %s in %s', (date, zone, count) => {
    const slots = daySlots(date, zone);
    expect(slots).toHaveLength(count);
    const plan = { ...base, date, places: [{ ...toronto, zone }], index: count - 1 };
    expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
    expect(parsePlan(JSON.stringify({ ...plan, index: 0 }))).not.toBeNull();
    expect(parsePlan(JSON.stringify({ ...plan, index: count }))).toBeNull();
    expect(parsePlan(JSON.stringify({ ...plan, index: 1_000_000 }))).toBeNull();
  });
  it('rejects a skipped local date without rejecting adjacent dates', () => {
    const apia = { ...base, places: [{ ...toronto, zone: 'Pacific/Apia' }] };
    expect(daySlots('2011-12-30', 'Pacific/Apia')).toEqual([]);
    expect(parsePlan(JSON.stringify({ ...apia, date: '2011-12-30' }))).toBeNull();
    expect(parsePlan(JSON.stringify({ ...apia, date: '2011-12-29' }))).not.toBeNull();
    expect(parsePlan(JSON.stringify({ ...apia, date: '2011-12-31' }))).not.toBeNull();
  });
  it('round trips validated plans', () => expect(parsePlan(JSON.stringify(base))).toEqual(base));
  it.each([
    { ...base, duration: 10000 }, { ...base, index: -1 }, { ...base, date: '2026-02-30' },
    { ...base, places: [{ ...toronto, zone: '<script>' }] },
    { ...base, places: [toronto, toronto] }, { ...base, places: [{ ...toronto, start: 543 }] },
    { ...base, places: [] },
  ])('rejects invalid or unexpected state %j', state => expect(parsePlan(JSON.stringify(state))).toBeNull());
  it('exports UTC calendar times across a daylight-saving transition', () => {
    const start = Date.parse('2026-11-01T05:45Z');
    const ics = calendarFile(start, 60, 'example', start);
    expect(ics).toContain('DTSTART:20261101T054500Z\r\nDTEND:20261101T064500Z');
    expect(ics).toContain('UID:example@overlap.local');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
