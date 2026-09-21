import { performance } from 'node:perf_hooks';
import { deepStrictEqual } from 'node:assert';
import { daySlots, localParts, matchingSlots, meetingFits, recommend } from '../src/time.ts';

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

// The previous comparator evaluates each candidate repeatedly during sorting.
function referenceRanking(matches, cities) {
  const score = t => cities.reduce((total, p) => {
    const length = (p.end - p.start + 1440) % 1440 || 1440;
    const middle = (p.start + length / 2) % 1440;
    const distance = Math.abs(localParts(t, p.zone).minute - middle);
    return total + Math.min(distance, 1440 - distance);
  }, 0);
  const result = [];
  for (const t of [...matches].sort((a, b) => score(a) - score(b) || a - b)) {
    if (result.every(other => Math.abs(other - t) >= 3_600_000)) result.push(t);
    if (result.length === 3) break;
  }
  return result;
}
for (const [date, zone] of [['2026-11-01', 'America/Toronto'], ['2026-10-04', 'Australia/Lord_Howe'], ['2019-03-17', 'Antarctica/Casey']]) {
  const candidates = daySlots(date, zone);
  for (const [start, end] of [[0, 0], [540, 1080], [1320, 360]]) {
    const cities = places.map(p => ({ ...p, start, end }));
    deepStrictEqual(recommend(candidates, cities), referenceRanking(candidates, cities));
  }
}
const oldRanking = median(() => referenceRanking(slots, places));
const newRanking = median(() => recommend(slots, places));
console.log('Ranking only: the same 100 candidates across 6 cities.');
console.log(`Comparator reference median: ${oldRanking.toFixed(2)} ms`);
console.log(`Pre-scored ranking median:   ${newRanking.toFixed(2)} ms (${(oldRanking / newRanking).toFixed(1)}x faster in this run)`);
console.log('Ranking results match across DST and overnight fixtures. Neither benchmark measures DOM rendering.');
