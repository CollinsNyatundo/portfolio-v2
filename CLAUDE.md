# CLAUDE.md — Claude Code notes for this repo

@AGENTS.md

The import above loads the shared instructions (project, source of truth, current state, stack, commands, hard rules,
conventions, how the files evolve). **Do not repeat shared content here.** This file holds only what is specific to
Claude Code, and it is a **living file** too: update it when a Claude-only tool, skill, MCP server, hook or setting is
added, changed or retired (trigger table in AGENTS.md).

## Tools and skills  <!-- LIVING: add/remove as they are adopted or dropped -->

| Need | Use | Notes |
|---|---|---|
| Library/framework docs | `ctx7` CLI (`npx ctx7@latest library …` then `docs …`) | Required before writing code against an API (user's global rule) |
| Code navigation | CodeGraph `codegraph_explore` | Only once a `.codegraph/` index exists; indexing is the owner's call |
| Planning / process | `superpowers:writing-plans`, `superpowers:test-driven-development`, `superpowers:verification-before-completion` | Plan in `docs/06`; prove each milestone's done criteria before claiming it |
| Home-page scroll design | `nateherk-design:scroll-craft` skill (scripts in its plugin folder: `doctor.mjs`, `workspace.mjs`, `serve.mjs`, `shoot.mjs`, `kie.mjs`, `encode.sh`) | Workspace resolves via `.scrollcraft.json` to `design/scrollcraft`. Generating assets needs `KIE_AI_API_KEY` (not set on 2026-11-03; owner adds it). Verification needs `playwright-core` in the build folder |
| UI work | `frontend-design`, `impeccable`, `ui-ux-pro-max` | Must obey `docs/04` tokens, the scroll-craft BRIEF and banned patterns; the skills don't override them |
| Security | `security-review`; Semgrep and OWASP ZAP through Docker (`semgrep/semgrep`, `ghcr.io/zaproxy/zaproxy:stable`) | Native Semgrep doesn't run on Windows. Scan a local `next start` with ZAP: scanning the live domain trips Vercel's bot challenge, which then blocks the scanner |
| Vercel | Vercel CLI 50.25.4 (logged in as the owner) + `vercel api` | Project `portfolio-v2`. In Git Bash prefix `vercel api` with `MSYS_NO_PATHCONV=1`, or `/v9/...` paths are rewritten. `vercel curl` reaches protected previews |
| Domain | Spaceship (registrar and DNS), edited through Claude in Chrome on the owner's session | **DNS changes and purchases need the owner's explicit yes** |
| LinkedIn / signed-in sites | Claude in Chrome | The built-in browser hits LinkedIn's auth wall |

## Claude-specific rules  <!-- LIVING -->

- The session may run in "caveman" output style. That style applies to chat only. Never use it in `AGENTS.md`, `CLAUDE.md`, `docs/`, commits, PRs, code comments or vault entries.
- Commit and PR attribution lines follow the harness's current attribution reminder.
- Prefer one PR per milestone task group; keep the task list in sync with `docs/06` task numbers (e.g. "M1.3").

## Hooks and settings  <!-- LIVING: record any .claude/settings.json hooks or permissions added for this repo -->

None yet.

## Changelog  <!-- append newest last; one line per change -->

- 2026-11-03 — Created; shared content moved to AGENTS.md and imported (Claude Code).
- 2026-11-03 — Added the scroll-craft skill row (Claude Code).
- 2026-11-05 — Vercel, Spaceship and Docker-based scanning rows updated at launch (Claude Code).
