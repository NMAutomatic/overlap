import { performance } from 'node:perf_hooks';
import { deepStrictEqual, ok } from 'node:assert';
import { availabilityWindows, daySlots, localParts, matchingSlots, meetingFits, recommend } from '../src/time.ts';

const places = ['America/Toronto', 'Europe/London', 'Asia/Kathmandu', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland']
  .map(zone => ({ zone, start: 480, end: 720, extra: [{ start: 780, end: 1080 }, { start: 1260, end: 120 }] }));
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
console.log('Matching only: 6 cities, 3 windows each, 120 minutes, 25-hour day.');
console.log(`Reference median: ${before.toFixed(2)} ms`);
console.log(`Cached median:    ${after.toFixed(2)} ms (${(before / after).toFixed(1)}x faster in this run)`);
console.log('Results match. Timings vary by machine; this does not measure DOM rendering.');

// The previous comparator evaluates each candidate repeatedly during sorting.
function referenceRanking(matches, cities) {
  const score = t => cities.reduce((total, p) => {
    const minute = localParts(t, p.zone).minute;
    return total + Math.min(...availabilityWindows(p).map(window => {
      const length = (window.end - window.start + 1440) % 1440 || 1440;
      const middle = (window.start + length / 2) % 1440;
      const distance = Math.abs(minute - middle);
      return Math.min(distance, 1440 - distance);
    }));
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

// These ceilings are deliberately much looser than observed local and CI medians.
// They catch gross algorithmic regressions without treating machine-to-machine noise as failure.
const budget = { matching: 50, ranking: 50 };
ok(after <= budget.matching, `Matching median ${after.toFixed(2)} ms exceeds ${budget.matching} ms budget`);
ok(newRanking <= budget.ranking, `Ranking median ${newRanking.toFixed(2)} ms exceeds ${budget.ranking} ms budget`);
console.log(`Performance budget passed: matching <= ${budget.matching} ms; ranking <= ${budget.ranking} ms.`);
