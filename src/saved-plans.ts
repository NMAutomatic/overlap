import { parsePlan } from './time';
import type { Plan } from './time';

export type SavedPlan = { name: string; plan: Plan };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const key = 'overlap-saved-plans-v1';
const limit = 12;

export function readSavedPlans(store: Store): SavedPlan[] {
  const raw = store.getItem(key);
  if (raw === null) return [];
  if (raw.length > 100_000) throw new Error('Saved plans could not be read. Existing data has not been changed.');
  const entries: unknown = JSON.parse(raw);
  if (!Array.isArray(entries) || entries.length > limit) throw new Error('Invalid saved plans. Existing data has not been changed.');
  const names = new Set<string>();
  return entries.map(entry => {
    const name = entry?.name;
    const plan = parsePlan(JSON.stringify(entry?.plan));
    if (typeof name !== 'string' || !name.trim() || name.length > 60 || names.has(name.trim().toLowerCase()) || !plan) {
      throw new Error('Invalid saved plan. Existing data has not been changed.');
    }
    names.add(name.trim().toLowerCase());
    return { name: name.trim(), plan };
  });
}

export function saveNamedPlan(store: Store, name: string, plan: Plan): void {
  const entries = readSavedPlans(store);
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) throw new Error('Use a name between 1 and 60 characters.');
  if (entries.some(entry => entry.name.toLowerCase() === trimmed.toLowerCase())) throw new Error('That name is already saved. Choose a different name.');
  if (entries.length >= limit) throw new Error('You can save up to 12 plans. Remove one before saving another.');
  const snapshot = parsePlan(JSON.stringify(plan));
  if (!snapshot) throw new Error('This plan cannot be saved. Check its date and time.');
  store.setItem(key, JSON.stringify([...entries, { name: trimmed, plan: snapshot }]));
}

export function removeNamedPlan(store: Store, name: string): void {
  const entries = readSavedPlans(store);
  store.setItem(key, JSON.stringify(entries.filter(entry => entry.name !== name)));
}
