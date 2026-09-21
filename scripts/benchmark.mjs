import { performance } from 'node:perf_hooks';
import { deepStrictEqual } from 'node:assert';
import { daySlots, matchingSlots, meetingFits } from '../src/time.ts';

const places = ['America/Toronto', 'Europe/London', 'Asia/Kathmandu', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland']
  .map(zone => ({ zone, start: 0, end: 0 }));
const plan = { date: '2026-11-01', places, duration: 120, index: 0, weekdays: false };
const slots = daySlots(plan.date, places[0].zone);
const reference = () => slots.filter(t => places.every(p => meetingFits(t, p, plan.duration, plan.weekdays)));
const optimized = () => matchingSlots(slots, plan);
deepStrictEqual(optimized(), reference());

function median(run) {
  for (let i = 0; i < 3; i++) run();
  const samples = [];
  for (let i = 0; i < 15; i++) {
    const start = performance.now(); run(); samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}
const before = median(reference);
const after = median(optimized);
console.log('Matching only: 6 cities, 120 minutes, 25-hour day, all-day availability.');
console.log(`Reference median: ${before.toFixed(2)} ms`);
console.log(`Cached median:    ${after.toFixed(2)} ms (${(before / after).toFixed(1)}x faster in this run)`);
console.log('Results match. Timings vary by machine; this does not measure DOM rendering.');
