import { describe, expect, it } from 'vitest';
import { meetingSummary } from './meeting-summary';
import { daySlots } from './time';
import type { Plan } from './time';

const plan: Plan = {
  date: '2026-09-20', duration: 60, index: 94, weekdays: false,
  places: [{ zone: 'America/Toronto', start: 0, end: 0 }, { zone: 'Asia/Kathmandu', start: 540, end: 1080 }],
};

describe('text meeting proposal', () => {
  it('exports both dates at midnight and fractional offsets in city order', () => {
    const text = meetingSummary(plan);
    expect(text).toContain('Duration: 60 minutes');
    expect(text).toContain('Start: 2026-09-20 23:30 (UTC-4)\nEnd:   2026-09-21 00:30 (UTC-4)');
    expect(text).toContain('Kathmandu — Asia/Kathmandu\nStart: 2026-09-21 09:15 (UTC+5:45)\nEnd:   2026-09-21 10:15 (UTC+5:45)');
    expect(text.indexOf('Toronto —')).toBeLessThan(text.indexOf('Kathmandu —'));
    expect(text).toContain('Fits all configured availability windows.');
    expect(text.endsWith('\n')).toBe(true);
  });
  it('distinguishes start and end offsets across a repeated hour', () => {
    const date = '2026-11-01';
    const index = daySlots(date, 'America/New_York').indexOf(Date.parse('2026-11-01T05:30:00Z'));
    const text = meetingSummary({ ...plan, date, index, places: [{ zone: 'America/New_York', start: 0, end: 0 }] });
    expect(text).toContain('Start: 2026-11-01 01:30 (UTC-4)\nEnd:   2026-11-01 01:30 (UTC-5)');
  });
  it('checks the entire meeting and weekday setting before claiming availability', () => {
    const text = meetingSummary({ ...plan, weekdays: true });
    expect(text).toContain('Some participants are outside their configured availability windows.');
    expect(text).toContain('Outside available hours');
    const partial = meetingSummary({ ...plan, places: [{ zone: 'America/Toronto', start: 1380, end: 0 }] });
    expect(partial).toContain('Outside available hours');
    expect(partial).not.toContain('Fits all configured availability windows.');
  });
});
