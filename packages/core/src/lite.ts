/**
 * Zod-free subset of @typeframe/core for browser bundles.
 * `<terminal-player>` must stay tiny (≤5 KB gzipped shell), so it imports
 * from '@typeframe/core/lite' instead of the package root (which pulls in
 * the zod schema validator). Schema validation stays in Node: CLI, CI, and
 * build-time tooling.
 */
export * from './ansi/parser.js'
export * from './engine.js'
export * from './physics/index.js'
export type {
  PhysicsMode,
  RichSpan,
  TerminalTimeline,
  TimelineEvent,
  TimelineMeta,
  WindowStyle,
} from './schema/timeline.js'
export * from './themes/themes.js'
