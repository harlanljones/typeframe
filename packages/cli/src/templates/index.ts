import {
  listThemes,
  PHYSICS_MODES,
  type PhysicsMode,
  parseTimeline,
  type TerminalTimeline,
  WINDOW_STYLES,
  type WindowStyle,
} from '@typeframe/core'

export interface TemplateContext {
  /** free-text prompt; templates may embed it as the typed command or title */
  prompt?: string
  theme?: string
  windowStyle?: WindowStyle
  physics?: PhysicsMode
  seed?: number
}

export interface Template {
  name: string
  description: string
  build(ctx?: TemplateContext): TerminalTimeline
}

const DEFAULT_THEME = 'tokyo-night'
const DEFAULT_CHROME: WindowStyle = 'macos'
const DEFAULT_PHYSICS: PhysicsMode = 'human'

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback
}

function meta(ctx: TemplateContext, overrides: Record<string, unknown> = {}) {
  return {
    theme: ctx.theme && listThemes().includes(ctx.theme) ? ctx.theme : DEFAULT_THEME,
    windowStyle: oneOf(ctx.windowStyle, WINDOW_STYLES, DEFAULT_CHROME),
    dimensions: { width: 60, height: 10 },
    physics: oneOf(ctx.physics, PHYSICS_MODES, DEFAULT_PHYSICS),
    seed: ctx.seed ?? 1337,
    title: ctx.prompt?.slice(0, 60) || 'terminal session',
    ...overrides,
  }
}

const hero: Template = {
  name: 'hero',
  description: 'Branded hero: draft a timeline from a prompt, then export.',
  build(ctx) {
    const cmd = ctx?.prompt
      ? `typeframe create "${ctx.prompt.replaceAll('"', "'").slice(0, 60)}"`
      : 'typeframe create "ship a demo"'
    return parseTimeline({
      version: '1.0',
      meta: meta(ctx ?? {}),
      events: [
        { type: 'prompt', text: '$ ' },
        { type: 'type', text: cmd, delay: 55 },
        { type: 'wait', duration: 350 },
        { type: 'output', text: '✔ timeline drafted', color: '#9ece6a' },
        { type: 'output', text: '▸ studio: t/c/p cycle · 1/2/3 export', color: '#7aa2f7' },
      ],
    })
  },
}

const install: Template = {
  name: 'install',
  description: 'Install flow: npm i -g typeframe then a ready line.',
  build(ctx) {
    return parseTimeline({
      version: '1.0',
      meta: meta(ctx ?? {}, { windowStyle: oneOf(ctx?.windowStyle, WINDOW_STYLES, 'flat') }),
      events: [
        { type: 'prompt', text: '$ ' },
        { type: 'type', text: 'npm i -g typeframe', delay: 55 },
        { type: 'wait', duration: 400 },
        { type: 'output', text: 'added 1 package in 1.2s', color: '#9ece6a' },
        {
          type: 'output',
          text: '✔ ready — run `typeframe --help`',
          color: '#7aa2f7',
        },
      ],
    })
  },
}

const demo: Template = {
  name: 'demo',
  description: 'Docker build that fails on a step, clears, then succeeds.',
  build(ctx) {
    return parseTimeline({
      version: '1.0',
      meta: meta(ctx ?? {}, {
        theme: ctx?.theme && listThemes().includes(ctx.theme) ? ctx.theme : 'catppuccin-mocha',
        windowStyle: oneOf(ctx?.windowStyle, WINDOW_STYLES, 'flat'),
        dimensions: { width: 44, height: 6 },
        physics: oneOf(ctx?.physics, PHYSICS_MODES, 'burst'),
        title: ctx?.prompt?.slice(0, 60) || 'docker build that fails then succeeds',
      }),
      events: [
        { type: 'prompt', text: '$ ' },
        { type: 'type', text: 'docker build -t typeframe .' },
        { type: 'wait', duration: 300 },
        { type: 'output', text: 'Step 3/5: RUN bun test' },
        { type: 'output', text: 'error: 1 test failed', stream: 'stderr' },
        { type: 'wait', duration: 500 },
        { type: 'clear' },
        { type: 'prompt', text: '$ ' },
        { type: 'type', text: 'docker build -t typeframe .' },
        { type: 'wait', duration: 300 },
        { type: 'output', text: '✔ Successfully built typeframe', color: '#a6e3a1' },
      ],
    })
  },
}

const welcome: Template = {
  name: 'welcome',
  description: 'Welcome banner with the typeframe CLI usage hint.',
  build(ctx) {
    return parseTimeline({
      version: '1.0',
      meta: meta(ctx ?? {}),
      events: [
        { type: 'prompt', text: '$ ' },
        { type: 'type', text: 'typeframe', delay: 70 },
        { type: 'wait', duration: 200 },
        { type: 'output', text: 'TypeFrame v0.1.0 — terminal animation studio', color: '#7dcfff' },
        {
          type: 'output',
          text: 'Usage: create | export | validate | record',
          color: '#bb9af7',
        },
      ],
    })
  },
}

export const TEMPLATES: Record<string, Template> = {
  hero,
  install,
  demo,
  welcome,
}

export function listTemplateNames(): string[] {
  return Object.keys(TEMPLATES)
}

export function getTemplate(name: string): Template | undefined {
  return TEMPLATES[name]
}

export function buildTemplate(name: string, ctx?: TemplateContext): TerminalTimeline {
  const t = TEMPLATES[name]
  if (!t) {
    throw new Error(`unknown template "${name}" (have: ${listTemplateNames().join(', ')})`)
  }
  return t.build(ctx)
}
