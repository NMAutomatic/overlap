import { describe, expect, it, vi } from 'vitest';
import { loadInitialPlan, readPlanLink } from './plan-link';
import type { Plan } from './time';

const plan: Plan = { date: '2026-09-20', index: 38, duration: 60, weekdays: true,
  places: [{ zone: 'UTC', start: 540, end: 1080, days: [0, 1, 2, 3, 4] }] };
const now = Date.parse('2026-09-21T15:00:00Z');
const link = (value: unknown) => `#${encodeURIComponent(JSON.stringify(value))}`;

describe('opening plan links', () => {
  it('loads a valid share without reading storage or changing its explicit date', () => {
    const read = vi.fn(() => { throw new Error('Storage blocked'); });
    const starter = vi.fn(() => plan);
    expect(loadInitialPlan(link(plan), read, starter, now)).toEqual({ plan, source: 'shared', invalidLink: false });
    expect(read).not.toHaveBeenCalled();
    expect(starter).not.toHaveBeenCalled();
  });
  it.each(['', '#', '#planner'])('treats %s as ordinary navigation and restores local preferences', hash => {
    expect(readPlanLink(hash)).toEqual({ kind: 'none' });
    expect(loadInitialPlan(hash, () => JSON.stringify(plan), () => plan, now)).toEqual({
      plan: { ...plan, date: '2026-09-21' }, source: 'saved', invalidLink: false,
    });
  });
  it.each(['#%', '#%E0%A4%A', '#%7B', '#null', link({ ...plan, date: '2026-02-30' }), link({ ...plan, index: 999 })])('flags a broken share without losing saved preferences: %s', hash => {
    const raw = JSON.stringify(plan);
    expect(readPlanLink(hash)).toEqual({ kind: 'invalid' });
    const result = loadInitialPlan(hash, () => raw, () => ({ ...plan, duration: 15 }), now);
    expect(result).toEqual({ plan: { ...plan, date: '2026-09-21' }, source: 'saved', invalidLink: true });
  });
  it('retains the invalid-link warning when storage is blocked or corrupted', () => {
    const starter = { ...plan, duration: 30 };
    for (const read of [() => { throw new Error('Blocked'); }, () => '{broken', () => null]) {
      expect(loadInitialPlan('#%', read, () => starter, now)).toEqual({ plan: starter, source: 'starter', invalidLink: true });
    }
  });
  it('opens the starter without a warning when neither a share nor saved data exists', () => {
    expect(loadInitialPlan('', () => null, () => plan, now)).toEqual({ plan, source: 'starter', invalidLink: false });
  });
  it('rejects an unavailable DST selection while retaining the saved local clock time', () => {
    const saved = { ...plan, date: '2026-03-07', index: 44, places: [{ zone: 'America/Toronto', start: 540, end: 1080 }] };
    const invalid = { ...saved, date: '2026-03-08', index: 92 };
    const result = loadInitialPlan(link(invalid), () => JSON.stringify(saved), () => plan, Date.parse('2026-03-08T16:00:00Z'));
    expect(result.invalidLink).toBe(true);
    expect(result.source).toBe('saved');
    expect(result.plan).toEqual({ ...saved, date: '2026-03-08', index: 40 });
  });
});
