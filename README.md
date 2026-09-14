# ▸ TypeFrame

> **Type. Frame. Ship.**

Turn terminal sessions into tiny, sharp, framework-agnostic web animations —
a pure **animated SVG**, a zero-dependency **`<terminal-player>`** web
component, or plain **timeline JSON**. No GIFs, no MP4s, no runtime bloat,
crisp on every DPI, copy/paste-friendly text.

```sh
bunx typeframe create "deploying to production with flyctl"
```

## Packages

| Package               | What it is                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| `@typeframe/core`     | Timeline schema (zod), ANSI parser, themes, typing physics, screen engine |
| `@typeframe/svg`      | Deterministic animated-SVG exporter (zero runtime JS, `prefers-reduced-motion` safe) |
| `@typeframe/player`   | `<terminal-player>` — self-contained web component (Shadow DOM, play/pause/restart/copy) |
| `typeframe`           | CLI + Ink TUI Studio: `create`, `export`, `validate`, `record`           |

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
