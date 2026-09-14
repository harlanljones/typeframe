# Pre-Development Audit — TypeFrame (PRD v1.0)

> Digest of the independent audit-agent review conducted before scaffolding.
> Verdict: **GO-WITH-CHANGES** — core engine development may start; the listed
> revisions were folded into `docs/SPEC-v1.1.md` and this scaffold.

## 1. Completeness Gaps

- No error-handling requirements (invalid timeline JSON, failed shell capture, LLM failure, pty crash).
- No accessibility requirements: `prefers-reduced-motion` static fallback, ARIA labels/roles on `<terminal-player>` controls, keyboard operability.
- No i18n guidance: CJK wide glyphs, RTL, combining characters affect cursor positioning fidelity.
- No license specified (resolved: MIT — maximizes embeddability of the web component).
- No schema versioning/semver policy; no config-file support for CI regeneration of animations.
- No CI/testing expectations: snapshot testing of SVG output, determinism guarantee, cross-platform matrix.
- No browser support matrix; no privacy/telemetry stance for an OSS CLI.

## 2. Internal Contradictions & Ambiguities

1. **Ink vs Bubbletea (§4.2 vs §5.2):** Go binary vs Node/TS distribution — language-level fork. *Resolved: Ink + TypeScript on bun; distribution = `bunx` + compiled single binary via `bun build --compile`.*
2. **`windowStyle` enum mismatch:** §4.2 promises 4 chrome options; §5.1 schema allowed only 3 (`macos | flat | minimal`) — `none` was unrepresentable. *Fixed in schema v1.0.*
3. **§6 workflow vs §4.3:** clipboard snippet copier was a de-facto fourth export path not covered by the export-target list.
4. **"Live scrubbing" in a TUI** is high-effort/low-certainty; cut to play/pause/restart for v1.

## 3. Feasibility & Technical Risk

- **CSS cannot animate text content.** The SVG export must choose a mechanism; adopted: per-character reveal via staggered `<text>` elements with CSS `animation-delay` (deterministic, no JS).
- **Font strategy:** web-safe monospace stack accepted (width drift tolerated for v1); embedded fonts would blow the 50 KB budget.
- **Size budgets redefined:** "player shell ≤ 5 KB gz; total artifact (shell + embedded timeline) ≤ N KB reported per artifact", enforced in CI (`bun run check:size`).
- **pty recording is not portable** (Windows needs ConPTY) — Unix-first, Windows tracked issue.
- **"100% component reuse" (Ink) claim is false** and was removed from the spec. Real reuse is at the logic layer: schema, ANSI parser, themes, physics, screen engine all live in `@typeframe/core` and are consumed by both the TUI and the web exporters.

## 4. Success Metrics Critique

"0 reported framework bugs" is not a measurable metric; "<5 ms" lacks a measurement definition. Replaced in SPEC v1.1 with instrumented, testable alternatives.

## 5. Milestone & Scope Risk

- LLM mode moved **out of the v1 critical path** (template library + pty recording cover input needs); npm publish moved up to M2; M4 becomes docs + polish.

## 6. Security & Privacy

- pty capture can record secrets → redaction/review gate required before export.
- User-controlled output text must be strictly XML-escaped in generated SVG (injection risk).
- Clipboard API requires permission fallback semantics.
- No telemetry in v1; LLM keys (post-v1) must never transit the CLI's own endpoints.

## 7. Competitive Landscape

Prior art the PRD ignored: **VHS** (Charm — Go, records to GIF/WebP/MP4), **asciinema** (session recording + JS player), **terminalizer**, **Carbon** (static code images). TypeFrame's differentiation: vector-first assets, no/zero-JS options, text-selectable, tiny byte budgets. A comparison table belongs in the eventual README/docs site.

## 8. Pre-Development Question List

1. TUI framework: **Ink (TS/bun)** — resolved.
2. SVG typing architecture: per-character staggered `<text>` + CSS keyframes — resolved.
3. Font strategy: web-safe mono stack — resolved.
4. Timeline location in Option B: embedded per-artifact; budgets redefined — resolved.
5. Schema v1.0 revisions: `none` chrome, cursor/backspace/prompt/scroll events, rich-text spans, physics as meta — resolved.
6. LLM mode in v1? — No (post-v1).
7. TUI preview reuses export renderer? — Shared `ScreenState` engine in core; TUI previews final frame of the same pipeline.
8. License — MIT.
9. Scrubber — cut for v1 (play/pause/restart).
10. Windows scope — Unix-first for pty; exports are platform-independent.

## 9. Verdict

**GO-WITH-CHANGES.** The core product idea is sound and differentiated; all scaffold-blocking questions above were resolved before the first commit and are encoded in this repository.
