# TypeFrame Spec v1.1 (development baseline)

Adopts PRD v1.0 with audit-driven revisions. Deltas from v1.0 are marked **[Δ]**.

## 1. Identity

- Name: **TypeFrame** (was "TermiMotion"). npm scope: `@typeframe/*`, CLI bin: `typeframe`.
- License: **MIT**. No telemetry in v1.

## 2. Stack (resolves PRD §4.2 vs §5.2 contradiction) **[Δ]**

- Language/runtime: **TypeScript on bun** (Node 22+ compatible).
- TUI: **Ink v7** (React). Distribution: `bunx typeframe` + single-file binary via `bun build --compile`.
- Bundler for the web component: esbuild/Bun.build, single-file, minified, ≤ 5 KB gzipped shell.
- PRD's "100% component and styling logic reuse" claim removed; real reuse is the shared logic layer (`@typeframe/core`): schema, ANSI parser, themes, typing physics, screen engine — consumed by TUI, SVG exporter, and web player alike.

## 3. Timeline Schema v1.0 (resolves §5.1 gaps) **[Δ]**

Frozen at `version: "1.0"`. zod source of truth in `packages/core/src/schema/timeline.ts`; JSON Schema artifact to be published alongside.

- `meta.windowStyle: "macos" | "flat" | "minimal" | "none"` — adds **none** (PRD promised 4 chrome options).
- `meta.physics: "human" | "burst" | "instant"` (default `human`), `meta.seed?: number` — typing physics is metadata, exportable deterministically.
- Events: `type`, `wait`, `output` (text **or** rich `spans`), `clear`, plus **[Δ]** `cursor`, `backspace`, `prompt`, `scroll`.
- `output` rich spans carry `{ text, color?, bold?, italic?, underline? }` — the ANSI-derived representation.
- Human-typist jitter/backspaces are **generation-time baked** via `materialize(timeline)` (seeded PRNG → byte-deterministic exports).

## 4. SVG Export (Export Option A) **[Δ]**

- Mechanism: per-character reveal — each typed char is a `<text>` node with CSS `animation-delay` (`--d` var); screens are `<g>` groups shown/hidden with keyframes at `clear` boundaries.
- Fonts: web-safe monospace stack (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`); no embedded fonts in v1.
- Determinism: same timeline + theme + seed ⇒ byte-identical SVG (snapshot-tested).
- Accessibility: `@media (prefers-reduced-motion: reduce)` renders the final frame statically; `role="img"` + `aria-label`.
- Security: all user text XML-escaped; no external refs; no scripts.
- Budget: ≤ 50 KB per SVG enforced in CI.

## 5. Web Component (Export Option B) **[Δ]**

- `<terminal-player>`: Shadow DOM, controls = play/pause, restart, copy-to-clipboard (with `execCommand` fallback + clipboard-permission failure handling), ARIA labels.
- Timeline embedded per artifact (`<script type="application/json">` or `data` property); budget defined as *shell ≤ 5 KB gz*, total size reported per artifact.
- `prefers-reduced-motion` → static final frame, paused.

## 6. CLI **[Δ]**

- `typeframe create [prompt]` → draft timeline → Ink Studio (theme `t`, chrome `c`, physics `p` cycle; `1|2|3` export; `q` quit). Non-TTY fallback writes timeline JSON.
- `typeframe export <file> [--format svg|player|json] [-o out]`
- `typeframe validate <file>` — schema validation with actionable errors.
- `typeframe record -- <cmd>` — pty capture; **Unix-first**, Windows/ConPTY tracked issue; **secret warning gate** before export of recorded sessions.

## 7. Out of scope for v1 **[Δ]**

Everything in PRD §7, plus: **LLM natural-language mode (post-v1)** — no API keys or network calls in the CLI v1; drag-scrubbing (v1 gets play/pause/restart); CJK/RTL perfect fidelity (best-effort grid metrics).

## 8. Milestones **[Δ]**

- M1: Core engine — schema, ANSI parser, themes, physics, screen engine, SVG exporter. ✔ scaffolded
- M2: Player bundle + **npm release** (moved up from M4).
- M3: Ink TUI Studio (play/pause/restart preview).
- M4: Docs site, templates library, polish. (LLM mode → v1.x)

## 9. Success metrics (made measurable) **[Δ]**

- Time-to-export: p95 < 90 s measured in instrumented dev builds (keystroke-log harness).
- Compatibility: e2e smoke render of exported SVG + player in a headless matrix (React/Vue/Svelte/static hosts) in CI; zero failures required to release.
- Runtime cost: player init ≤ 5 ms p95 measured via `performance.mark` in the headless harness.
