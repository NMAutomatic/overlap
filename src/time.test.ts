import { describe, expect, it } from 'vitest';
import { available, calendarFile, daySlots, localParts, matchingSlots, meetingFits, parsePlan, recommend, STEP, utcOffset } from './time';
import type { Place, Plan } from './time';
const toronto: Place = { zone: 'America/Toronto', start: 540, end: 1020 };
const base: Plan = { date: '2026-09-14', places: [toronto], duration: 60, index: 0, weekdays: false };

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

describe('portable plans', () => {
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
