import { city, daySlots, localParts, meetingFits, utcOffset } from './time';
import type { Plan } from './time';

/** Include both dates and offsets so a plain-text proposal stays unambiguous. */
export function meetingSummary(plan: Plan): string {
  const start = daySlots(plan.date, plan.places[0].zone)[plan.index];
  const end = start + plan.duration * 60_000;
  const stamp = (instant: number, zone: string) => {
    const local = localParts(instant, zone);
    return `${local.date} ${local.time} (${utcOffset(instant, zone)})`;
  };
  const allFit = plan.places.every(place => meetingFits(start, place, plan.duration, plan.weekdays));
  return [
    'Overlap meeting proposal',
    `Duration: ${plan.duration} minutes`,
    allFit ? 'Fits all configured availability windows.' : 'Some participants are outside their configured availability windows.',
    '',
    ...plan.places.flatMap(place => [
      `${city(place.zone)} — ${place.zone}`,
      `Start: ${stamp(start, place.zone)}`,
      `End:   ${stamp(end, place.zone)}`,
      meetingFits(start, place, plan.duration, plan.weekdays) ? 'Within available hours' : 'Outside available hours',
      '',
    ]),
    'Availability reflects this plan only, not calendar bookings.',
    '',
  ].join('\n');
}
