export const STEP = 15 * 60_000;
export type Place = { zone: string; start: number; end: number };
export type Plan = { date: string; places: Place[]; duration: number; index: number; weekdays: boolean };
const cache = new Map<string, Intl.DateTimeFormat>();

/** Read wall-clock fields for a UTC instant using the browser's IANA rules. */
export function localParts(instant: number, zone: string) {
  let formatter = cache.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    });
    cache.set(zone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(instant).map(p => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute: Number(parts.hour) * 60 + Number(parts.minute),
    time: `${parts.hour}:${parts.minute}`,
    weekday: parts.weekday,
  };
}

export function validDate(date: string): boolean {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return false;
  const value = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date;
}

/** A reference city's calendar day can contain 23, 24 or 25 actual hours. */
export function daySlots(date: string, zone: string): number[] {
  if (!validDate(date)) return [];
  const midnightUTC = Date.parse(`${date}T00:00:00Z`);
  const result: number[] = [];
  for (let t = midnightUTC - 14 * 3_600_000; t < midnightUTC + 38 * 3_600_000; t += STEP) {
    if (localParts(t, zone).date === date) result.push(t);
  }
  return result;
}

/** Navigate local calendar dates, not fixed 24-hour intervals. */
export function neighboringDate(date: string, zone: string, direction: -1 | 1): string | null {
  if (!validDate(date)) return null;
  let day = Date.parse(`${date}T12:00:00Z`);
  while (true) {
    day += direction * 86_400_000;
    const candidate = new Date(day).toISOString().slice(0, 10);
    if (!validDate(candidate)) return null;
    if (daySlots(candidate, zone).length) return candidate;
  }
}

/** Preserve the base city's wall-clock time when changing the planning date. */
export function movePlanDate(plan: Plan, date: string): { plan: Plan; timeAdjusted: boolean } | null {
  const zone = plan.places[0].zone;
  const oldSlots = daySlots(plan.date, zone);
  const nextSlots = daySlots(date, zone);
  if (!oldSlots.length || !nextSlots.length) return null;
  const oldInstant = oldSlots[Math.min(Math.max(plan.index, 0), oldSlots.length - 1)];
  const minute = localParts(oldInstant, zone).minute;
  const minutes = nextSlots.map(t => localParts(t, zone).minute);
  // In a repeated hour, prefer the occurrence matching the previous offset.
  let index = nextSlots.findIndex((t, i) => minutes[i] === minute && utcOffset(t, zone) === utcOffset(oldInstant, zone));
  if (index < 0) index = minutes.indexOf(minute);
  // A spring-forward gap moves to the first available wall-clock time after it.
  if (index < 0) index = minutes.findIndex(m => m > minute);
  if (index < 0) index = nextSlots.length - 1;
  return { plan: { ...plan, date, index }, timeAdjusted: minutes[index] !== minute };
}

/** Removing the reference city changes the date/slider frame, not the meeting. */
export function removePlanPlace(plan: Plan, removeIndex: number): Plan | null {
  if (!Number.isInteger(removeIndex) || removeIndex < 0 || removeIndex >= plan.places.length || plan.places.length === 1) return null;
  const places = plan.places.filter((_, index) => index !== removeIndex);
  if (removeIndex !== 0) return { ...plan, places };
  const instant = daySlots(plan.date, plan.places[0].zone)[plan.index];
  if (instant === undefined) return null;
  const date = localParts(instant, places[0].zone).date;
  const index = daySlots(date, places[0].zone).indexOf(instant);
  if (index < 0) return null;
  return { ...plan, places, date, index };
}

export function available(instant: number, place: Place, weekdays = false): boolean {
  const local = localParts(instant, place.zone);
  // An overnight window belongs to the day on which it starts.
  const overnight = place.start > place.end;
  const ownerDay = overnight && local.minute < place.end
    ? new Date(Date.parse(`${local.date}T12:00:00Z`) - 86_400_000).getUTCDay()
    : new Date(`${local.date}T12:00:00Z`).getUTCDay();
  if (weekdays && (ownerDay === 0 || ownerDay === 6)) return false;
  if (place.start === place.end) return true;
  return overnight ? local.minute >= place.start || local.minute < place.end
    : local.minute >= place.start && local.minute < place.end;
}

export function meetingFits(instant: number, place: Place, duration: number, weekdays = false): boolean {
  for (let offset = 0; offset < duration; offset += 15) {
    if (!available(instant + offset * 60_000, place, weekdays)) return false;
  }
  return true;
}

export function matchingSlots(slots: number[], plan: Plan): number[] {
  return slots.filter(t => plan.places.every(p => meetingFits(t, p, plan.duration, plan.weekdays)));
}

/** Keep recommendations an hour apart, preferring each window's midpoint. */
export function recommend(matches: number[], places: Place[]): number[] {
  const score = (t: number) => places.reduce((total, p) => {
    const length = (p.end - p.start + 1440) % 1440 || 1440;
    const middle = (p.start + length / 2) % 1440;
    const distance = Math.abs(localParts(t, p.zone).minute - middle);
    return total + Math.min(distance, 1440 - distance);
  }, 0);
  const sorted = [...matches].sort((a, b) => score(a) - score(b) || a - b);
  const result: number[] = [];
  for (const t of sorted) {
    if (result.every(other => Math.abs(other - t) >= 3_600_000)) result.push(t);
    if (result.length === 3) break;
  }
  return result;
}

export function city(zone: string): string {
  return zone.split('/').at(-1)!.replaceAll('_', ' ');
}

export function utcOffset(instant: number, zone: string): string {
  return new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'shortOffset' })
    .formatToParts(instant).find(p => p.type === 'timeZoneName')!.value.replace('GMT', 'UTC');
}

export function parsePlan(raw: string): Plan | null {
  try {
    if (raw.length > 5000) return null;
    const p = JSON.parse(raw) as Plan;
    if (!p || !validDate(p.date) || ![15, 30, 45, 60, 90, 120].includes(p.duration)
      || !Number.isInteger(p.index) || p.index < 0 || typeof p.weekdays !== 'boolean'
      || !Array.isArray(p.places) || p.places.length < 1 || p.places.length > 6) return null;
    const zones = new Set<string>();
    for (const place of p.places) {
      if (!place || typeof place.zone !== 'string' || place.zone.length > 80 || zones.has(place.zone)) return null;
      for (const v of [place.start, place.end]) if (!Number.isInteger(v) || v < 0 || v >= 1440 || v % 15 !== 0) return null;
      new Intl.DateTimeFormat('en', { timeZone: place.zone }).format();
      zones.add(place.zone);
    }
    if (p.index >= daySlots(p.date, p.places[0].zone).length) return null;
    return { date: p.date, duration: p.duration, index: p.index, weekdays: p.weekdays,
      places: p.places.map(({ zone, start, end }) => ({ zone, start, end })) };
  } catch { return null; }
}

/** Reopen local preferences on today's date without reusing a DST-dependent index. */
export function restoreSavedPlan(raw: string, now = Date.now()): Plan | null {
  const stored = parsePlan(raw);
  if (!stored) return null;
  return movePlanDate(stored, localParts(now, stored.places[0].zone).date)?.plan ?? null;
}

export function calendarFile(start: number, duration: number, uid: string, now = Date.now()): string {
  const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Overlap//Meeting Planner//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid.replace(/[^a-zA-Z0-9-]/g, '')}@overlap.local`, `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + duration * 60_000)}`,
    'SUMMARY:Overlap meeting', 'DESCRIPTION:Time planned with Overlap.', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
