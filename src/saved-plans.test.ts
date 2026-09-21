import { describe, expect, it } from 'vitest';
import { readSavedPlans, removeNamedPlan, saveNamedPlan } from './saved-plans';
import type { Plan } from './time';

const plan: Plan = { date: '2026-09-21', index: 44, duration: 60, weekdays: true, places: [{ zone: 'America/Toronto', start: 540, end: 1080 }] };
const store = () => {
  let value: string | null = null;
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
};

describe('named local plans', () => {
  it('stores independent snapshots and restores all scheduling fields', () => {
    const storage = store();
    const withDays = { ...plan, places: [{ ...plan.places[0], days: [0, 1, 2, 3, 4] }] };
    const copy = structuredClone(withDays);
    saveNamedPlan(storage, ' Team ', copy);
    copy.places[0].start = 600;
    copy.places[0].days.push(5);
    saveNamedPlan(storage, 'Friends', { ...plan, duration: 30 });
    expect(readSavedPlans(storage)).toEqual([{ name: 'Team', plan: withDays }, { name: 'Friends', plan: { ...plan, duration: 30 } }]);
  });
  it('rejects duplicate names without overwriting an existing plan', () => {
    const storage = store(); saveNamedPlan(storage, 'Team', plan);
    expect(() => saveNamedPlan(storage, ' team ', { ...plan, duration: 30 })).toThrow('already saved');
    expect(readSavedPlans(storage)[0].plan.duration).toBe(60);
  });
  it('removes only the selected snapshot', () => {
    const storage = store(); saveNamedPlan(storage, 'Team', plan); saveNamedPlan(storage, 'Friends', plan);
    removeNamedPlan(storage, 'Team');
    expect(readSavedPlans(storage).map(entry => entry.name)).toEqual(['Friends']);
  });
  it('rejects invalid names, plans and excessive counts', () => {
    const storage = store();
    for (const name of [' ', 'x'.repeat(61)]) expect(() => saveNamedPlan(storage, name, plan)).toThrow();
    expect(() => saveNamedPlan(storage, 'Invalid', { ...plan, index: 1000 })).toThrow();
    for (let i = 0; i < 12; i++) saveNamedPlan(storage, `Plan ${i}`, plan);
    expect(() => saveNamedPlan(storage, 'Too many', plan)).toThrow('up to 12');
    expect(readSavedPlans(storage)).toHaveLength(12);
  });
  it('preserves corrupted stored data instead of overwriting it', () => {
    const storage = store(); storage.setItem('', '{broken');
    expect(() => saveNamedPlan(storage, 'Team', plan)).toThrow();
    expect(storage.getItem()).toBe('{broken');
  });
  it('surfaces quota failures rather than claiming to save', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } };
    expect(() => saveNamedPlan(storage, 'Team', plan)).toThrow('Quota exceeded');
  });
});
