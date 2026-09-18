# ▸ TypeFrame

> **Type. Frame. Ship.**

Turn terminal sessions into tiny, sharp, framework-agnostic web animations —
a pure **animated SVG**, a zero-dependency **`<terminal-player>`** web
component, or plain **timeline JSON**. No GIFs, no MP4s, no runtime bloat,
crisp on every DPI, copy/paste-friendly text.

```sh
bunx typeframe create "deploying to production with flyctl"
```

## Features

- **PTY Recording** — Capture real terminal sessions with `record` and replay them with exact timing
- **Interactive Studio** — Live preview and edit timelines in the TUI with playback controls
- **Multi-Format Export** — SVG (animated, deterministic, copy-paste text), web component, JSON, or raw timeline
- **Schema Export** — Generate JSON Schema from the TypeFrame format for validation and IDE autocomplete
- **Composable CLI** — Single-file binary (no deps) or installable npm package
- **Security First** — Built-in warnings for recorded sessions that may contain secrets

## Packages

| Package               | What it is                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| `@typeframe/core`     | Timeline schema (zod), ANSI parser, themes, typing physics, screen engine, JSON Schema export |
| `@typeframe/svg`      | Deterministic animated-SVG exporter (zero runtime JS, `prefers-reduced-motion` safe) |
| `@typeframe/player`   | `<terminal-player>` — self-contained web component (Shadow DOM, play/pause/restart/copy) |
| `typeframe`           | CLI: binary or npm. Commands: `create`, `export`, `validate`, `record`. Interactive studio with live playback preview |

## Quick Start

```sh
# Interactive studio: create or edit a timeline
bunx typeframe create

# Record a real terminal session (Unix-first)
bunx typeframe record -- echo "hello world"

# Export to SVG
bunx typeframe export timeline.json output.svg

# Validate a timeline
bunx typeframe validate timeline.json

# Show help or version
bunx typeframe --help
bunx typeframe --version
```

## Development

```sh
bun install
bun run test        # vitest
bun run lint        # biome
bun run typecheck   # tsc --noEmit
bun run check:size  # enforce ≤50 KB SVG / ≤5 KB gz player budgets
```

## Docs

- [`docs/PRD.md`](docs/PRD.md) — original product requirements (v1.0)
- [`docs/AUDIT.md`](docs/AUDIT.md) — pre-development audit findings
- [`docs/SPEC-v1.1.md`](docs/SPEC-v1.1.md) — revised spec adopted for development

## License

[MIT](LICENSE)
