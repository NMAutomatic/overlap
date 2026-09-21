# Overlap

**A good time. For everyone.**

A small, browser-local meeting planner for people in different time zones. Put cities side by side, slide through a day, and find a time that respects everyone's hours.

[Open the planner](https://nmautomatic.github.io/overlap/) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

## What it does

- Compare up to six time zones, with searchable cities and three starting presets. Search accepts common aliases (NYC, Kolkata/Calcutta), accents and selected Chinese city names.
- Move to the previous day, next day or today while preserving the base city's local meeting time. If daylight saving skips that time, the planner moves forward to an available time and tells you.
- Make any city the base for the planning date and slider without removing other cities or losing their hours. The meeting stays at the same UTC instant, including during repeated DST hours; the local planning date adjusts automatically.
- Remove a city without changing the meeting's actual instant. Removing the base city updates the planning date and slider to the next city's local time, including across midnight and repeated DST hours.
- Set up to three availability windows per city, such as morning and afternoon with a lunch break. Overlapping or adjacent windows combine; gaps remain unavailable, and each window can cross midnight.
- Adjust each city's hours and available weekdays, including overnight windows and non-Monday–Friday workweeks. Each city can use the plan's default days or its own selection; custom selections stay unchanged when the default changes.
- Explore the reference city's actual day in 15-minute steps, including 23- and 25-hour daylight-saving days.
- Identify full matches only when the **whole meeting** fits everyone's availability.
- When no full match exists, review up to three partial matches with the exact minutes outside availability for each affected city. These stay labeled as partial matches; selecting one does not change anyone’s available hours.
- Compare seven calendar dates starting from the planning date, see how many full-duration matches each has, and choose a suggested start. Dates and times follow the base city; custom workweeks and DST apply on every day.
- Copy a link that restores the date, cities, hours, selected weekdays, duration and selected start.
- Get an explicit warning for a broken or incomplete share link. The planner recovers saved preferences when available; otherwise it identifies the starter plan. Continuing with that plan replaces the broken link with a valid one.
- Edit an opened shared plan and refresh without losing changes; its URL updates in place as you work.
- Export an `.ics` calendar event with unambiguous UTC times.
- Download a plain-text meeting proposal with start/end dates, UTC offsets and availability for every city, ready to send in a chat.
- Remember preferences locally without accounts, tracking scripts or external fonts.
- Save up to 12 named snapshots in this browser, then load or remove them from “My saved plans”. Snapshots preserve the full plan and its original date; editing the planner does not overwrite them. Names are not included in shared links. Resetting the current plan leaves named snapshots intact; remove them individually from the saved-plan dialog.
- Reopen saved preferences on today's date in the base city while keeping its local meeting time across daylight-saving changes. Shared links retain their explicit date.
- Use the planner on mobile or with a keyboard and a screen reader. Dialogs have accessible names; adding a city focuses its hours, switching presets keeps focus on the chosen preset, and resetting focuses the planning date.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the `/overlap/` path shown by Vite. For a production preview:

```sh
npm run check
npm run preview
```

`npm run check` runs the domain tests, strict TypeScript checks and a production build. GitHub Actions runs the same checks for pull requests and deploys passing `main` builds to GitHub Pages.

The workflow uses Node.js 24-compatible GitHub Actions for checkout, setup and Pages publishing. The application's build and tests still run on Node.js 22, matching the supported local development environment. Pull requests only validate; publishing requires a passing `main` build or a manual workflow run.

## Design and implementation

The interface is deliberately quiet: a paper background, a shared time axis, a green availability band, and a warm orange selection. All city timelines refer to the same UTC instants. The first city defines the planning date; each row also shows its own local date so crossing midnight stays visible.

A targeted manual review checked rendered text colors against the planner, paper and result-panel backgrounds, including small time-zone labels, saved-plan links and meeting end times. It used the [WCAG text contrast formula](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); this targeted check is not a complete accessibility audit.

The app uses TypeScript and browser APIs with **no runtime package dependencies**. Vite, TypeScript and Vitest are development tools.

| File | Responsibility |
| --- | --- |
| `src/time.ts` | Time-zone conversion, day boundaries, availability, suggestions, share validation and calendar serialization |
| `src/time.test.ts` | Regression cases for DST, date-line crossings, fractional offsets, overnight hours, validation and calendar output |
| `src/compare-days.ts` | Seven-date comparison with full-duration matches and exact suggested instants |
| `src/city-search.ts` | Ranked city, alias and IANA path search using browser-supported zone IDs |
| `src/main.ts` | UI state, local persistence and browser interactions |
| `src/style.css` | Responsive layout and accessible focus states |

### Why enumerate instants?

Converting an arbitrary local wall-clock time to UTC is ambiguous when clocks go backward, and can be impossible when they go forward. Overlap starts with UTC instants, then uses `Intl.DateTimeFormat` to select those belonging to the reference city's date. A repeated hour stays represented twice, with UTC offsets distinguishing the two occurrences; a skipped hour never appears. Entire skipped local dates are rejected, including in shared links. Shared selections must exist in the actual local day: out-of-range selections are rejected rather than silently moved, while valid selections on unusually long days remain shareable. Calendar exports preserve the selected instant.

The matching engine checks every 15-minute segment for the full duration, including segments after midnight. It ranks valid starts by proximity to the nearest window midpoint for each city and spaces suggestions at least an hour apart. These are convenient suggestions, not an optimization of individual preferences.

If there is no full match on the selected date, partial suggestions first maximize the number of cities whose whole meeting fits, then minimize the largest per-city time outside availability, then the total outside minutes. Ties favor the earlier UTC instant, and suggestions are spaced at least 30 minutes apart. Each cost counts 15-minute intervals using the city’s local hours and selected weekdays. A candidate must fit at least one city fully; no partial suggestions appear if every city would be outside its hours. This is an explicit heuristic, not a claim about participants’ preferences or consent.

Overlapping meeting windows reuse availability checks within a single calculation. The cache is discarded after each calculation, so changing hours or weekdays never reuses an older answer. Recommendation scores are computed once per candidate. Moving the selected-time slider reuses the recommendations until the date, cities, hours, days or duration change. Run `npm run benchmark` to compare matching and ranking against their previous implementations for six cities on a 25-hour day, including result-equivalence checks across DST and overnight fixtures. It reports median timings for computation only, not browser rendering, and is not a hardware-independent performance guarantee.

## Privacy and limits

There is no application backend. The current plan is kept in `localStorage`; reset it from the footer. Sharing encodes that plan in a URL fragment. The fragment is not sent in the HTTP page request, but **anyone you give the link to can read its contents**. The static hosting provider still processes normal page requests.

Availability is the union of up to three repeating daily windows per city, not a connected calendar. Additional windows are saved locally and included in shared links; older single-window plans still work. Equal start and end times mean all-day availability. Select available days separately for each city; selecting no days means that city is unavailable all week. For overnight windows, the weekday belongs to the day the window starts. Custom city days are included in shared links and named snapshots; older plans without custom days retain their original default behavior. Holidays, personal calendar conflicts, different hours on different weekdays and live collaboration are not yet supported.

Time-zone rules come from the browser and may lag government changes. The supported planning range is 2000–2099 with quarter-hour resolution. This is a planning aid; confirm important meeting times with participants.

## Development approach

This project is developed with Codex assistance. Changes should solve a real user problem, carry focused validation, and be understandable from their commit and documentation. There are no activity-only commits or synthetic usage statistics.

## License

[MIT](LICENSE)
