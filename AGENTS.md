# Project guidance

Overlap is a browser-local time-zone planner. Read README.md and ROADMAP.md first.

- Keep changes focused on a real usability or correctness improvement.
- Preserve the browser-local, no-account product boundary and zero runtime dependencies unless there is a concrete reason to change them.
- Use explicit UTC instants and IANA time zones in tests. Do not substitute fixed offsets for daylight-saving rules.
- Run `npm run check` before committing. UI changes also need a desktop/mobile and keyboard check when browser tools are available.
- Keep README and roadmap accurate. Never claim checks or usage statistics that were not observed.
- Do not fabricate activity, backdate commits, create empty commits or repeatedly edit documentation without new substance.
- Do not include private assets, credentials, machine paths, other projects' content, or personal photos.
- Check working-tree and remote state before editing. Preserve unrelated work. Do not force-push or rewrite shared history.
- Maintain one cohesive commit for one cohesive improvement. Use descriptive commit messages.
- Local build products and node_modules must remain untracked.
