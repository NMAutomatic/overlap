# Contributing

Start with an issue describing the problem and an observable outcome. For a small fix, a focused pull request is welcome directly.

1. Install with `npm ci` on Node.js 22.12 or newer.
2. Make one cohesive change. Keep the time engine separate from browser UI code.
3. For time logic, add a regression test with an explicit UTC instant and IANA zone. Avoid tests tied to today's date or your machine's time zone.
4. Run `npm run check`.
5. For UI changes, check desktop and narrow mobile layouts, keyboard focus, empty states and reduced motion.
6. Describe what changed, why, and how you verified it in the pull request.

Do not add API keys, personal data, tracking, external font requests or runtime services without discussing the need. Preserve the no-account workflow. Avoid dependency additions when a small browser-native implementation is clearer.

The application is built with Codex assistance. Contributors should review generated code as carefully as any other code and report only checks they actually ran.
