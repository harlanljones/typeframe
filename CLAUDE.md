# TypeFrame — Agent Guide

- Runtime: **bun** (workspaces under `packages/*`). Node 26+ also works for vitest.
- Commands: `bun run test` (vitest), `bun run lint` (biome), `bun run typecheck`, `bun run check:size` (bundle budget CI gate).
- Packages: `@typeframe/core` (schema/ansi/themes/physics/engine — no internal deps), `@typeframe/svg`, `@typeframe/player`, `typeframe` (CLI). Lower packages may depend only on packages above them in that list.
- Timeline schema is **frozen v1.0** — see `packages/core/src/schema/timeline.ts` and `docs/SPEC-v1.1.md` before proposing changes.
- SVG output must be **deterministic** (same timeline + theme → byte-identical output); snapshot tests enforce this.
- All user-controlled text must be XML-escaped before embedding in SVG/HTML (see `@typeframe/svg` escapeXml, `@typeframe/player` escapeHtml).
- LLM mode is **post-v1** — do not add API keys or network calls to the CLI.
