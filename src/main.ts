import './style.css';
import { compareDays } from './compare-days';
import { searchZones } from './city-search';
import { meetingSummary } from './meeting-summary';
import { readSavedPlans, removeNamedPlan, saveNamedPlan } from './saved-plans';
import { availabilityDays, available, calendarFile, city, daySlots, localParts, matchingSlots, meetingFits, movePlanDate, neighboringDate, parsePlan, recommend, removePlanPlace, restoreSavedPlan, utcOffset } from './time';
import type { Plan } from './time';

const app = document.querySelector<HTMLDivElement>('#app')!;
const storageKey = 'overlap-plan-v1';
const presets = {
  atlantic: ['America/Toronto', 'Europe/London', 'Europe/Berlin'],
  global: ['America/Los_Angeles', 'Europe/London', 'Asia/Singapore'],
  distance: ['America/Toronto', 'Asia/Shanghai'],
};
const defaultPlan = (): Plan => ({
  date: localParts(Date.now(), presets.atlantic[0]).date,
  places: presets.atlantic.map(zone => ({ zone, start: 540, end: 1080 })),
  duration: 30, index: 44, weekdays: false,
});
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const icon = (name: string) => {
  const paths: Record<string, string> = {
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    share: '<path d="M9 15 15 9M8 17l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 8a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1" transform="translate(0 -1)"/>',
    calendar: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h2m2 0h2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeOptions = (selected: number) => Array.from({ length: 96 }, (_, i) => {
  const minutes = i * 15;
  const label = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return `<option value="${minutes}" ${minutes === selected ? 'selected' : ''}>${label}</option>`;
}).join('');
function initialPlan(): Plan {
  try {
    if (location.hash && location.hash !== '#planner') return parsePlan(decodeURIComponent(location.hash.slice(1))) || defaultPlan();
    const stored = restoreSavedPlan(localStorage.getItem(storageKey) || '');
    if (stored) return stored;
  } catch { /* Private browsing and malformed links should still open a usable planner. */ }
  return defaultPlan();
}
let plan = initialPlan();
let slots: number[] = [];
let matches: number[] = [];
let noticeTimer: ReturnType<typeof setTimeout>;
let zones: string[];
try { zones = Intl.supportedValuesOf('timeZone'); }
catch { zones = [...presets.atlantic, ...presets.global, ...presets.distance, 'Asia/Kolkata', 'Asia/Kathmandu', 'Pacific/Auckland']; }
zones = [...new Set(['UTC', ...zones])];

function planURL() { return `${location.origin}${location.pathname}${location.search}#${encodeURIComponent(JSON.stringify(plan))}`; }
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(plan)); } catch { /* Optional storage. */ }
  // Keep an opened share editable across refresh, without adding browser history entries.
  if (location.hash && location.hash !== '#planner') history.replaceState(null, '', planURL());
}
function recalculate() {
  slots = daySlots(plan.date, plan.places[0].zone);
  plan.index = Math.min(Math.max(plan.index, 0), slots.length - 1);
  matches = matchingSlots(slots, plan);
}
function notify(message: string) {
  const toast = document.querySelector<HTMLElement>('#notice')!;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}
function dateLabel(instant: number, zone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short' }).format(instant);
}
function render() {
  recalculate();
  app.innerHTML = `
    <a class="skip" href="#planner">Skip to planner</a>
    <header class="header shell">
      <a href="${import.meta.env.BASE_URL}" class="brand" aria-label="Overlap home"><span class="brand-mark" aria-hidden="true"></span>overlap</a>
      <div class="header-right"><span class="local-note"><i></i> Works in your browser</span><a href="https://github.com/NMAutomatic/overlap" target="_blank" rel="noopener noreferrer">Source code ↗</a></div>
    </header>
    <main class="shell" id="planner" tabindex="-1">
      <section class="intro">
        <div><p class="eyebrow">LESS BACK-AND-FORTH, MORE TIME TOGETHER</p><h1>A good time.<br><span>For everyone.</span></h1></div>
        <div class="intro-aside"><div class="orbit" aria-hidden="true"><span></span><span></span><i></i></div><p>Different cities. One shared moment.<br>Find the hours that work for all of you.</p></div>
      </section>
      <div class="workspace">
        <section class="planner-panel" aria-label="Time zone planner">
          <div class="panel-top"><div><p class="eyebrow">01 / YOUR PEOPLE</p><h2>Around the same table.</h2></div><button id="add-city" class="button subtle" ${plan.places.length >= 6 ? 'disabled' : ''}>${icon('plus')} Add city</button></div>
          <div class="presets"><span>Try a setup</span><button data-preset="atlantic">Across the Atlantic</button><button data-preset="global">Global team</button><button data-preset="distance">Long distance</button></div>
          <button id="saved-plans" class="text-button saved-plans-trigger">My saved plans</button>
          <div class="controls">
            <label>Planning date <input id="date" type="date" min="2000-01-01" max="2099-12-31" value="${plan.date}"></label>
            <label>Duration <select id="duration">${[15, 30, 45, 60, 90, 120].map(n => `<option value="${n}" ${plan.duration === n ? 'selected' : ''}>${n} minutes</option>`).join('')}</select></label>
            <label>Default days <select id="weekdays"><option value="all" ${!plan.weekdays ? 'selected' : ''}>Every day</option><option value="weekdays" ${plan.weekdays ? 'selected' : ''}>Mon–Fri</option></select></label>
          </div>
          <p class="days-help">Choose days per city below, or keep the default. Overnight hours belong to the day they start.</p>
          <nav class="date-navigation" aria-label="Planning date shortcuts">
            <button id="previous-day" ${neighboringDate(plan.date, plan.places[0].zone, -1) ? '' : 'disabled'} aria-label="Previous planning day">← Previous day</button>
            <button id="today" ${plan.date === localParts(Date.now(), plan.places[0].zone).date ? 'disabled' : ''}>Today</button>
            <button id="next-day" ${neighboringDate(plan.date, plan.places[0].zone, 1) ? '' : 'disabled'} aria-label="Next planning day">Next day →</button>
          </nav>
          <p class="reference">Date & slider follow <strong>${escape(city(plan.places[0].zone))}</strong> · ${slots.length / 4}-hour day</p>
          <div id="board"></div>
          <div class="scrubber"><div class="scrubber-heading"><label for="time-slider">Explore the day</label><output id="slider-time" for="time-slider"></output></div><input id="time-slider" type="range" min="0" max="${slots.length - 1}" step="1" value="${plan.index}" aria-label="Meeting start time in ${escape(city(plan.places[0].zone))}"><div class="scale"><span>Start of day</span><span>Drag to find your moment</span><span>End of day</span></div></div>
          <div class="legend"><span><i class="swatch available"></i>Available</span><span><i class="swatch unavailable"></i>Outside hours</span><span><i class="swatch selected"></i>Your selection</span></div>
        </section>
        <aside class="result-panel" aria-label="Meeting recommendations"><div id="result"></div></aside>
      </div>
      <section class="bottom-notes"><div><span class="note-number">01</span><div><h3>Set your own hours.</h3><p>Early bird, night owl, or somewhere in between. Adjust each city’s availability.</p></div></div><div><span class="note-number">02</span><div><h3>Keep the whole meeting in mind.</h3><p>A match means your full meeting fits everyone’s hours, including across midnight.</p></div></div><div><span class="note-number">03</span><div><h3>Make it a date.</h3><p>Share a link to the same plan, or save a calendar file. No sign-up required.</p></div></div></section>
    </main>
    <footer class="shell footer"><span>overlap <span class="muted">/ a little more in sync.</span></span><details><summary>How it works & privacy</summary><p>Times use your browser’s IANA time-zone database, including daylight saving rules. The planner checks 15-minute intervals. Availability is a daily window; equal start and end means all day. Selected days follow each city’s local date; custom city days override the default; overnight hours belong to the day they start. Calendar files use exact UTC instants.</p><p>Your plan is saved on this device. A shared link includes your cities and availability in its URL fragment. Anyone with that link can read it. There are no accounts, analytics, external fonts or application servers; the static hosting provider handles normal page requests. Browser time-zone rules may need updates when governments change their clocks.</p><button id="reset" class="text-button">Reset current plan</button></details><a href="https://github.com/NMAutomatic/overlap/blob/main/ROADMAP.md" target="_blank" rel="noopener noreferrer">What’s next ↗</a></footer>
    <dialog id="city-dialog"><form method="dialog" class="dialog-top"><h2>Add a city</h2><button class="icon-button" aria-label="Close city picker">${icon('close')}</button></form><label class="search-label" for="city-search">Search city or time zone</label><input id="city-search" type="search" placeholder="Try NYC, Kolkata, 东京…" autocomplete="off"><p class="muted small">One time zone per city · up to six cities</p><div id="city-results"></div></dialog>
    <dialog id="share-dialog"><form method="dialog" class="dialog-top"><h2>Your plan link</h2><button class="icon-button" aria-label="Close share link">${icon('close')}</button></form><p>Copy this link to share the same date, cities and meeting time.</p><input id="share-value" readonly aria-label="Link to your plan"></dialog>
    <dialog id="compare-dialog" aria-labelledby="compare-title">
      <form method="dialog" class="dialog-top"><h2 id="compare-title">Find a day that works.</h2><button class="icon-button" aria-label="Close day comparison">${icon('close')}</button></form>
      <p id="compare-description" class="small muted"></p><ol id="compared-days"></ol><p id="compare-note" class="small muted"></p>
    </dialog>
    <dialog id="saved-dialog" aria-labelledby="saved-title">
      <form method="dialog" class="dialog-top"><h2 id="saved-title">My saved plans</h2><button class="icon-button" aria-label="Close saved plans">${icon('close')}</button></form>
      <p class="small muted">Save up to 12 snapshots in this browser. Each keeps its date, cities, hours and meeting time.</p>
      <form id="save-plan-form"><label class="search-label" for="plan-name">Name this plan</label><div class="save-plan-fields"><input id="plan-name" required maxlength="60" autocomplete="off" placeholder="e.g. Design team"><button class="button subtle" type="submit">Save current plan</button></div></form>
      <p id="saved-feedback" class="small" role="status" aria-live="polite"></p><div id="saved-list"></div>
      <p class="small muted">Names stay on this device and are not included in shared links. Clearing browser data removes these snapshots.</p>
    </dialog>
    <div id="notice" role="status" aria-live="polite"></div>`;
  draw();
  bind();
}

function draw() {
  const instant = slots[plan.index];
  const end = instant + plan.duration * 60_000;
  document.querySelector('#board')!.innerHTML = plan.places.map((p, i) => {
    const local = localParts(instant, p.zone);
    const days = availabilityDays(p, plan.weekdays);
    const fit = meetingFits(instant, p, plan.duration, plan.weekdays);
    const selectedWidth = Math.min(plan.duration / 15, slots.length - plan.index) / slots.length * 100;
    return `<article class="city-row">
      <div class="city-top"><div class="city-identity"><span class="city-symbol color-${i % 3}" aria-hidden="true">${i === 0 ? '⌂' : '↗'}</span><div><h3>${escape(city(p.zone))}${i === 0 ? '<span class="reference-badge">BASE</span>' : ''}</h3><span class="city-zone">${escape(utcOffset(instant, p.zone))} · ${escape(p.zone.split('/')[0])}</span></div></div><div class="city-clock"><strong>${local.time}</strong><span>${dateLabel(instant, p.zone)}</span></div><button class="icon-button remove" data-remove="${i}" aria-label="Remove ${escape(city(p.zone))}" ${plan.places.length === 1 ? 'disabled' : ''}>${icon('close')}</button></div>
      <div class="city-hours"><span class="fit-label ${fit ? 'fits' : ''}">${fit ? '● Within hours' : '○ Outside hours'}</span><label>Available <select data-hours="start" data-city="${i}" aria-label="${escape(city(p.zone))} availability start">${timeOptions(p.start)}</select></label><span>–</span><select data-hours="end" data-city="${i}" aria-label="${escape(city(p.zone))} availability end">${timeOptions(p.end)}</select></div>
      <fieldset class="city-days"><legend>${escape(city(p.zone))} available days</legend><div class="day-buttons">${[1, 2, 3, 4, 5, 6, 0].map(day => `<button data-day="${day}" data-city="${i}" aria-label="${escape(city(p.zone))} ${dayNames[day]}" aria-pressed="${days.includes(day)}">${dayNames[day].slice(0, 2)}</button>`).join('')}</div><div class="days-caption"><span>${p.days === undefined ? 'Using default days' : days.length ? 'Custom days' : 'No available days'}</span><button data-default-days="${i}" aria-label="Use default days for ${escape(city(p.zone))}" ${p.days === undefined ? 'disabled' : ''}>Use default</button></div></fieldset>
      <button class="timeline" data-timeline="${i}" aria-label="Select a time on ${escape(city(p.zone))} timeline" style="--count:${slots.length}">${slots.map(t => `<span class="tick ${available(t, p, plan.weekdays) ? 'open' : ''}" aria-hidden="true"></span>`).join('')}<span class="selection" style="left:${plan.index / slots.length * 100}%;width:${selectedWidth}%" aria-hidden="true"></span></button>
      <div class="hour-labels" aria-hidden="true">${[0, .25, .5, .75].map(f => `<span>${localParts(slots[Math.floor(slots.length * f)], p.zone).time}</span>`).join('')}<span>${localParts(slots.at(-1)! + 15 * 60_000, p.zone).time}</span></div>
    </article>`;
  }).join('');
  const count = plan.places.filter(p => meetingFits(instant, p, plan.duration, plan.weekdays)).length;
  const allFit = count === plan.places.length;
  const picks = recommend(matches, plan.places);
  document.querySelector('#result')!.innerHTML = `
    <p class="eyebrow">02 / YOUR SHARED MOMENT</p>
    <div class="result-status ${allFit ? 'good' : 'mixed'}"><i></i>${allFit ? 'A good time for everyone' : `${count} of ${plan.places.length} cities within hours`}</div>
    <div class="big-time">${localParts(instant, plan.places[0].zone).time}<span>— ${localParts(end, plan.places[0].zone).time}</span></div>
    <p class="result-date">${dateLabel(instant, plan.places[0].zone)} · ${escape(city(plan.places[0].zone))}</p>
    <div class="meeting-ticket">${plan.places.map(p => `<div><span>${escape(city(p.zone))}</span><div><strong>${localParts(instant, p.zone).time} – ${localParts(end, p.zone).time}</strong><small>${escape(utcOffset(instant, p.zone))}${utcOffset(end, p.zone) !== utcOffset(instant, p.zone) ? ` → ${escape(utcOffset(end, p.zone))}` : ''} · ${dateLabel(instant, p.zone)}${localParts(end, p.zone).date !== localParts(instant, p.zone).date ? ` → ${dateLabel(end, p.zone)}` : ''}</small></div></div>`).join('')}</div>
    <button class="button primary full" id="calendar">${icon('calendar')} Save calendar invite ${icon('arrow')}</button>
    <button class="button share full" id="share">${icon('share')} Copy plan link</button>
    <button class="button share full" id="text-summary">${icon('arrow')} Save text summary</button>
    <div class="suggestions"><div class="suggestion-title"><h3>${matches.length ? 'Room to connect' : 'No shared window yet'}</h3><span>${matches.length ? `${matches.length} starts` : 'Check days & hours'}</span></div>
    ${matches.length ? `<p>Suggested starts in ${escape(city(plan.places[0].zone))}. Each fits the full ${plan.duration} minutes.</p><div class="suggestion-buttons">${picks.map(t => `<button data-pick="${slots.indexOf(t)}" class="${t === instant ? 'active' : ''}"><span>${localParts(t, plan.places[0].zone).time}<small>${escape(utcOffset(t, plan.places[0].zone))}</small></span>${icon('arrow')}</button>`).join('')}</div>` : '<p>Someone would be outside their available hours. Adjust a city’s days or hours, shorten the meeting, or try another date.</p>'}<button class="button share full" id="compare-days">Compare 7 days ${icon('arrow')}</button></div>
    <div class="result-footnote"><span aria-hidden="true">↳</span> All times adjust for daylight saving.</div>`;
  const slider = document.querySelector<HTMLInputElement>('#time-slider')!;
  slider.value = String(plan.index);
  slider.setAttribute('aria-valuetext', `${localParts(instant, plan.places[0].zone).time} ${utcOffset(instant, plan.places[0].zone)}, ${count} of ${plan.places.length} cities within hours`);
  slider.style.setProperty('--progress', `${plan.index / (slots.length - 1) * 100}%`);
  document.querySelector('#slider-time')!.textContent = `${localParts(instant, plan.places[0].zone).time} ${utcOffset(instant, plan.places[0].zone)} · ${city(plan.places[0].zone)}`;
  bindDynamic();
}

function select(index: number) { plan.index = index; persist(); draw(); }
function bindDynamic() {
  document.getElementById('compare-days')!.onclick = showDayComparison;
  document.querySelectorAll<HTMLButtonElement>('[data-day]').forEach(button => button.onclick = () => {
    const place = plan.places[Number(button.dataset.city)];
    const day = Number(button.dataset.day);
    const days = availabilityDays(place, plan.weekdays);
    place.days = days.includes(day) ? days.filter(value => value !== day) : [...days, day].sort();
    recalculate(); persist(); draw();
    document.querySelector<HTMLButtonElement>(`[data-city="${button.dataset.city}"][data-day="${day}"]`)!.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-default-days]').forEach(button => button.onclick = () => {
    delete plan.places[Number(button.dataset.defaultDays)].days;
    recalculate(); persist(); draw();
    document.querySelector<HTMLButtonElement>(`[data-city="${button.dataset.defaultDays}"][data-day="1"]`)!.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(button => button.onclick = () => {
    const updated = removePlanPlace(plan, Number(button.dataset.remove));
    if (!updated) {
      notify('This meeting falls outside the supported dates in the next base city. Choose another time before removing this city.'); return;
    }
    plan = updated; persist(); render(); document.querySelector<HTMLButtonElement>('#add-city')!.focus();
  });
  document.querySelectorAll<HTMLSelectElement>('[data-hours]').forEach(select => select.onchange = () => {
    plan.places[Number(select.dataset.city)][select.dataset.hours as 'start' | 'end'] = Number(select.value);
    recalculate(); persist(); draw();
    document.querySelector<HTMLSelectElement>(`[data-city="${select.dataset.city}"][data-hours="${select.dataset.hours}"]`)!.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-timeline]').forEach(button => button.onclick = event => {
    const rect = button.getBoundingClientRect();
    select(event.detail === 0 ? Math.min(plan.index + 1, slots.length - 1) : Math.max(0, Math.min(slots.length - 1, Math.floor((event.clientX - rect.left) / rect.width * slots.length))));
    document.querySelector<HTMLButtonElement>(`[data-timeline="${button.dataset.timeline}"]`)!.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.onclick = () => {
    select(Number(button.dataset.pick)); document.querySelector<HTMLInputElement>('#time-slider')!.focus();
  });
  document.querySelector<HTMLButtonElement>('#calendar')!.onclick = () => {
    const blob = new Blob([calendarFile(slots[plan.index], plan.duration, crypto.randomUUID())], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `overlap-${plan.date}.ics`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Calendar file downloaded. Open it in your calendar app.');
  };
  document.querySelector<HTMLButtonElement>('#share')!.onclick = async () => {
    const url = planURL();
    try { await navigator.clipboard.writeText(url); notify('Plan link copied. Ready to share.'); }
    catch {
      const input = document.querySelector<HTMLInputElement>('#share-value')!;
      input.value = url; document.querySelector<HTMLDialogElement>('#share-dialog')!.showModal(); input.focus(); input.select();
    }
  };
  document.querySelector<HTMLButtonElement>('#text-summary')!.onclick = () => {
    const url = URL.createObjectURL(new Blob([meetingSummary(plan)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `overlap-${plan.date}.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Text summary downloaded. Ready to share.');
  };
}

function showDayComparison() {
  const days = compareDays(plan);
  const zone = plan.places[0].zone;
  document.getElementById('compare-description')!.textContent = `${days.length} dates starting ${plan.date}, in ${city(zone)}. Each possible start fits the full ${plan.duration} minutes for every city. Times below follow ${city(zone)}.`;
  document.getElementById('compared-days')!.innerHTML = days.map((day, i) => {
    const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`));
    const suggestion = day.suggested;
    const time = suggestion ? `${localParts(suggestion.instant, zone).time} ${utcOffset(suggestion.instant, zone)}` : '';
    return `<li><button data-compare-day="${i}" ${suggestion ? '' : 'disabled'} ${suggestion ? `aria-label="Choose ${day.date} at ${escape(time)}"` : ''}><span><strong>${weekday} · ${day.date}</strong><small>${day.exists ? `${day.starts} possible starts` : 'Date does not exist in this city'}</small></span><span class="compared-start">${suggestion ? `Choose ${escape(time)} ${icon('arrow')}` : 'No match'}</span></button></li>`;
  }).join('');
  document.getElementById('compare-note')!.textContent = days.some(day => day.starts)
    ? 'Choose a suggested start to update the planner. Counts are alternative starts, not separate meetings.'
    : 'No full matches in this range. Try changing available days, hours or meeting duration.';
  document.querySelectorAll<HTMLButtonElement>('[data-compare-day]').forEach(button => button.onclick = () => {
    const day = days[Number(button.dataset.compareDay)];
    if (!day.suggested) return;
    plan = { ...plan, date: day.date, index: day.suggested.index };
    persist(); render(); document.getElementById('compare-days')!.focus();
    notify(`Selected ${day.date} · ${localParts(day.suggested.instant, zone).time} ${utcOffset(day.suggested.instant, zone)}. Fits every city.`);
  });
  document.querySelector<HTMLDialogElement>('#compare-dialog')!.showModal();
}

function changeDate(date: string, focusId: string) {
  const moved = movePlanDate(plan, date);
  if (!moved) {
    document.querySelector<HTMLInputElement>('#date')!.value = plan.date;
    notify(`Choose an existing date in ${city(plan.places[0].zone)} between 2000 and 2099.`); return;
  }
  plan = moved.plan;
  persist(); render();
  const target = document.getElementById(focusId) as HTMLButtonElement | HTMLInputElement;
  (target.disabled ? document.getElementById('date')! : target).focus();
  const instant = slots[plan.index];
  notify(`${dateLabel(instant, plan.places[0].zone)} · ${localParts(instant, plan.places[0].zone).time} ${utcOffset(instant, plan.places[0].zone)}${moved.timeAdjusted ? '. The original time does not exist on this date; moved to the next available time.' : ''}`);
}

function bind() {
  document.getElementById('saved-plans')!.onclick = () => {
    showSavedPlans(); document.querySelector<HTMLDialogElement>('#saved-dialog')!.showModal();
    document.getElementById('plan-name')!.focus();
  };
  document.getElementById('save-plan-form')!.onsubmit = event => {
    event.preventDefault();
    try {
      const input = document.querySelector<HTMLInputElement>('#plan-name')!;
      saveNamedPlan(localStorage, input.value, plan);
      input.value = ''; showSavedPlans(); savedFeedback('Plan saved in this browser.'); input.focus();
    } catch (error) { savedFeedback(error instanceof Error ? error.message : 'Could not save. Browser storage may be unavailable.'); }
  };
  document.querySelector<HTMLAnchorElement>('.skip')!.onclick = event => {
    event.preventDefault(); document.getElementById('planner')!.focus();
  };
  document.querySelector<HTMLInputElement>('#time-slider')!.oninput = event => select(Number((event.target as HTMLInputElement).value));
  document.querySelector<HTMLInputElement>('#date')!.onchange = event => {
    const date = (event.target as HTMLInputElement).value;
    changeDate(date, 'date');
  };
  for (const [id, direction] of [['previous-day', -1], ['next-day', 1]] as const) {
    document.getElementById(id)!.onclick = () => {
      const date = neighboringDate(plan.date, plan.places[0].zone, direction);
      if (date) changeDate(date, id);
    };
  }
  document.getElementById('today')!.onclick = () => changeDate(localParts(Date.now(), plan.places[0].zone).date, 'today');
  document.querySelector<HTMLSelectElement>('#duration')!.onchange = event => { plan.duration = Number((event.target as HTMLSelectElement).value); recalculate(); persist(); draw(); };
  document.querySelector<HTMLSelectElement>('#weekdays')!.onchange = event => { plan.weekdays = (event.target as HTMLSelectElement).value === 'weekdays'; recalculate(); persist(); draw(); };
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.onclick = () => {
    plan.places = presets[button.dataset.preset as keyof typeof presets].map(zone => ({ zone, start: 540, end: 1080 }));
    recalculate(); const picks = recommend(matches, plan.places); if (picks.length) plan.index = slots.indexOf(picks[0]);
    persist(); render();
  });
  document.querySelector<HTMLButtonElement>('#add-city')!.onclick = () => {
    document.querySelector<HTMLDialogElement>('#city-dialog')!.showModal(); showCities(''); document.querySelector<HTMLInputElement>('#city-search')!.focus();
  };
  document.querySelector<HTMLInputElement>('#city-search')!.oninput = event => showCities((event.target as HTMLInputElement).value);
  document.querySelector<HTMLButtonElement>('#reset')!.onclick = () => {
    plan = defaultPlan(); persist(); history.replaceState(null, '', location.pathname); render(); notify('Current plan reset. Named snapshots are unchanged.');
  };
}

function savedFeedback(message: string) { document.getElementById('saved-feedback')!.textContent = message; }
function showSavedPlans() {
  savedFeedback(''); document.getElementById('saved-list')!.innerHTML = '';
  try {
    const entries = readSavedPlans(localStorage);
    document.getElementById('saved-list')!.innerHTML = entries.length ? entries.map((entry, i) => `<div class="saved-plan-row"><div><strong>${escape(entry.name)}</strong><small>${entry.plan.date} · ${entry.plan.duration} min<br>${entry.plan.places.map(p => escape(city(p.zone))).join(' · ')}</small></div><div class="saved-plan-actions"><button class="button subtle" data-load-plan="${i}" aria-label="Load ${escape(entry.name)}">Load</button><button class="text-button" data-remove-plan="${i}" aria-label="Remove saved plan ${escape(entry.name)}">Remove</button></div></div>`).join('') : '<p class="empty">No saved plans yet.</p>';
    document.querySelectorAll<HTMLButtonElement>('[data-load-plan]').forEach(button => button.onclick = () => {
      const entry = entries[Number(button.dataset.loadPlan)];
      plan = entry.plan; persist(); render(); document.getElementById('saved-plans')!.focus(); notify(`Loaded ${entry.name} · ${plan.date}.`);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-remove-plan]').forEach(button => button.onclick = () => {
      const entry = entries[Number(button.dataset.removePlan)];
      try { removeNamedPlan(localStorage, entry.name); showSavedPlans(); savedFeedback(`Removed ${entry.name}. The current planner is unchanged.`); document.getElementById('plan-name')!.focus(); }
      catch (error) { savedFeedback(error instanceof Error ? error.message : 'Could not remove this plan.'); }
    });
  } catch { savedFeedback('Saved plans could not be read. Browser storage may be unavailable; existing data has not been changed.'); }
}

function showCities(query: string) {
  const found = searchZones(zones, query, plan.places.map(p => p.zone));
  document.querySelector('#city-results')!.innerHTML = found.length ? found.map(zone => `<button class="city-option" data-zone="${escape(zone)}"><span>${escape(city(zone))}<small>${escape(zone)}</small></span>${icon('plus')}</button>`).join('') : '<p class="empty">No matching time zone. Try another city in the same region.</p>';
  document.querySelectorAll<HTMLButtonElement>('[data-zone]').forEach(button => button.onclick = () => {
    if (plan.places.length >= 6) return;
    plan.places.push({ zone: button.dataset.zone!, start: 540, end: 1080 });
    document.querySelector<HTMLDialogElement>('#city-dialog')!.close(); persist(); render(); document.querySelector<HTMLButtonElement>('#add-city')!.focus();
  });
}
window.addEventListener('hashchange', () => {
  if (!location.hash || location.hash === '#planner') return;
  try { const shared = parsePlan(decodeURIComponent(location.hash.slice(1))); if (shared) { plan = shared; render(); notify('Shared plan opened.'); } else notify('This plan link is invalid. Your current plan is unchanged.'); }
  catch { notify('This plan link is invalid. Your current plan is unchanged.'); }
});
render();
