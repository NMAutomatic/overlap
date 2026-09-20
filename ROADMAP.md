# Roadmap

The goal is a reliable, approachable tool for finding a shared time. This is a direction, not a promise of release dates.

## Shipped in 0.1

- [x] Side-by-side timelines for up to six cities
- [x] Custom and overnight availability windows
- [x] DST-aware days, dates and calendar exports
- [x] Full-duration matching and ranked suggested starts
- [x] Shareable plans, local preferences and responsive layout
- [x] Domain regression tests and continuous deployment

## Next: make everyday planning easier

- [x] Explicit UTC offsets in suggestions, slider labels and meeting summaries
- [ ] Search aliases for common city names and alternate spellings
- [ ] English / Chinese interface toggle with persisted language preference
- [ ] Named local plans so teams and personal groups can coexist
- [ ] Previous / next day shortcuts and a clear return-to-today action

## Then: improve the planning model

- [ ] Per-city weekday selection, including non-Monday–Friday workweeks
- [ ] Multiple availability windows per day
- [ ] Multi-day comparison for finding the best day as well as the best hour
- [ ] Clear tradeoff suggestions when no complete overlap exists
- [ ] Downloadable text summary of a proposed meeting

## Quality work

- [ ] Automated browser coverage of sharing, city management and keyboard flows
- [ ] Automated accessibility audit alongside manual checks
- [x] Regression cases for half-hour DST transitions and Samoa’s skipped calendar date
- [ ] A measured performance budget for six-city timelines

## Out of scope for now

Accounts, calendar OAuth, paid infrastructure, analytics, meeting recordings and AI-generated scheduling advice. Keeping the app local and lightweight is intentional.
