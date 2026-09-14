import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { TerminalTimeline } from '@typeframe/core'
import { playerHTML } from '@typeframe/player'
import { renderSVG } from '@typeframe/svg'

export type ExportFormat = 'svg' | 'player' | 'json'
export const EXPORT_FORMATS: ExportFormat[] = ['svg', 'player', 'json']

function defaultName(format: ExportFormat): string {
  switch (format) {
    case 'svg':
      return 'hero.svg'
    case 'player':
      return 'terminal-player.html'
    case 'json':
      return 'timeline.json'
  }
}

// The player bundle is a build artifact at <repo>/dist/terminal-player.js.
// Resolved from cwd (the repo root in dev, tests, and CLI invocation).
function distBundlePath(): string {
  return join(process.cwd(), 'dist', 'terminal-player.js')
}

/**
 * Locate (or build) the single-file <terminal-player> bundle so the exported
 * HTML can inline it and stay self-contained (SPEC §5). Builds on the fly under
 * bun; otherwise expects `bun run build:player` to have produced dist/.
 */
async function getPlayerBundle(): Promise<string> {
  const distPath = distBundlePath()
  try {
    return await readFile(distPath, 'utf8')
  } catch {
    // not prebuilt — fall through to a build below
  }
  if (typeof Bun === 'undefined' || !Bun.build) {
    throw new Error(
      'terminal-player bundle missing — run `bun run build:player` first (or export under bun).',
    )
  }
  const out = await Bun.build({
    entrypoints: [join(process.cwd(), 'packages', 'player', 'src', 'index.ts')],
    minify: true,
    target: 'browser',
  })
  if (!out.success) throw new Error('failed to build terminal-player bundle')
  const js = await out.outputs[0].text()
  await mkdir(join(process.cwd(), 'dist'), { recursive: true })
  await writeFile(distPath, js)
  return js
}

/** Write an export artifact; returns the path written. */
export async function exportTimeline(
  format: ExportFormat,
  timeline: TerminalTimeline,
  out?: string,
): Promise<string> {
  const path = out ?? defaultName(format)
  let body: string
  switch (format) {
    case 'svg':
      body = renderSVG(timeline, { title: timeline.meta.title })
      break
    case 'player':
      body = playerHTML(timeline, { js: await getPlayerBundle() })
      break
    case 'json':
      body = `${JSON.stringify(timeline, null, 2)}\n`
      break
  }
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, body)
  return path
}

function parseArgs(args: string[]): { file?: string; format: ExportFormat; out?: string } {
  const positional: string[] = []
  let format: ExportFormat = 'svg'
  let out: string | undefined
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--format') {
      const v = args[i + 1]
      if (v === 'svg' || v === 'player' || v === 'json') format = v
      i++
    } else if (a === '-o') {
      out = args[i + 1]
      i++
    } else if (a !== undefined) {
      positional.push(a)
    }
  }
  return { file: positional[0], format, out }
}

export async function exportCmd(args: string[]): Promise<number> {
  const { file, format, out } = parseArgs(args)
  if (!file) {
    process.stderr.write(
      'usage: typeframe export <timeline.json> [--format svg|player|json] [-o out]\n',
    )
    return 1
  }
  let raw: string
  try {
    raw = await readFile(file, 'utf8')
  } catch {
    process.stderr.write(`✖ cannot read ${file}\n`)
    return 1
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (err) {
    process.stderr.write(`✖ invalid JSON in ${file}: ${(err as Error).message}\n`)
    return 1
  }
  const { safeParseTimeline } = await import('@typeframe/core')
  const res = safeParseTimeline(json)
  if (!res.ok) {
    process.stderr.write(`✖ ${file} failed schema validation:\n`)
    for (const issue of res.error.issues) process.stderr.write(`  - ${JSON.stringify(issue)}\n`)
    return 1
  }
  const path = await exportTimeline(format, res.timeline, out)
  process.stdout.write(`✔ wrote ${path}\n`)
  return 0
}
