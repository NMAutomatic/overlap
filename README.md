# Overlap

**A good time. For everyone.**

A small, browser-local meeting planner for people in different time zones. Put cities side by side, slide through a day, and find a time that respects everyone's hours.

[Open the planner](https://nmautomatic.github.io/overlap/) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

## What it does

- Compare up to six time zones, with searchable cities and three starting presets. Search accepts common aliases (NYC, Kolkata/Calcutta), accents and selected Chinese city names.
- Move to the previous day, next day or today while preserving the base city's local meeting time. If daylight saving skips that time, the planner moves forward to an available time and tells you.
- Remove a city without changing the meeting's actual instant. Removing the base city updates the planning date and slider to the next city's local time, including across midnight and repeated DST hours.
- Adjust each city's availability, including overnight windows and optional weekdays.
- Explore the reference city's actual day in 15-minute steps, including 23- and 25-hour daylight-saving days.
- Suggest meeting starts only when the **whole meeting** fits everyone's availability.
- Copy a link that restores the date, cities, hours, duration and selected start.
- Export an `.ics` calendar event with unambiguous UTC times.
- Download a plain-text meeting proposal with start/end dates, UTC offsets and availability for every city, ready to send in a chat.
- Remember preferences locally without accounts, tracking scripts or external fonts.
- Reopen saved preferences on today's date in the base city while keeping its local meeting time across daylight-saving changes. Shared links retain their explicit date.
- Use the planner on mobile or with a keyboard and a screen reader.

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

The app uses TypeScript and browser APIs with **no runtime package dependencies**. Vite, TypeScript and Vitest are development tools.

| File | Responsibility |
| --- | --- |
| `src/time.ts` | Time-zone conversion, day boundaries, availability, suggestions, share validation and calendar serialization |
| `src/time.test.ts` | Regression cases for DST, date-line crossings, fractional offsets, overnight hours, validation and calendar output |
| `src/city-search.ts` | Ranked city, alias and IANA path search using browser-supported zone IDs |
| `src/main.ts` | UI state, local persistence and browser interactions |
| `src/style.css` | Responsive layout and accessible focus states |

### Why enumerate instants?

Converting an arbitrary local wall-clock time to UTC is ambiguous when clocks go backward, and can be impossible when they go forward. Overlap starts with UTC instants, then uses `Intl.DateTimeFormat` to select those belonging to the reference city's date. A repeated hour stays represented twice, with UTC offsets distinguishing the two occurrences; a skipped hour never appears. Entire skipped local dates are rejected, including in shared links. Shared selections must exist in the actual local day: out-of-range selections are rejected rather than silently moved, while valid selections on unusually long days remain shareable. Calendar exports preserve the selected instant.

The matching engine checks every 15-minute segment for the full duration, including segments after midnight. It ranks valid starts by proximity to the midpoint of each city's availability window and spaces suggestions at least an hour apart. These are convenient suggestions, not an optimization of individual preferences.

## Privacy and limits

There is no application backend. The current plan is kept in `localStorage`; reset it from the footer. Sharing encodes that plan in a URL fragment. The fragment is not sent in the HTTP page request, but **anyone you give the link to can read its contents**. The static hosting provider still processes normal page requests.

Availability is a repeating daily window, not a connected calendar. Equal start and end times mean all-day availability. For overnight windows, the weekday belongs to the day the window starts. Holidays, personal calendar conflicts, per-day schedules and live collaboration are not yet supported.

Time-zone rules come from the browser and may lag government changes. The supported planning range is 2000–2099 with quarter-hour resolution. This is a planning aid; confirm important meeting times with participants.

## Development approach

This project is developed with Codex assistance. Changes should solve a real user problem, carry focused validation, and be understandable from their commit and documentation. There are no activity-only commits or synthetic usage statistics.

## License

[MIT](LICENSE)
