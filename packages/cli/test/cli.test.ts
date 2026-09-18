import { execSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { safeParseTimeline } from '@typeframe/core'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import packageJson from '../package.json' with { type: 'json' }
import { HELP, main } from '../src/cli.js'
import { buildTimelineFromPrompt, create } from '../src/commands/create.js'
import { exportTimeline } from '../src/commands/export.js'
import { validateCmd } from '../src/commands/validate.js'
import { eventDelay, finalFrame, frameAt } from '../src/studio/studio.js'
import { buildTemplate, listTemplateNames, TEMPLATES } from '../src/templates/index.js'

// The player export inlines the built bundle; ensure it exists before export tests.
beforeAll(() => {
  execSync('bun run build:player', { stdio: 'ignore' })
})

describe('cli commands', () => {
  it('prints help successfully for empty and help arguments', async () => {
    const out: string[] = []
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      out.push(String(s))
      return true
    })
    try {
      for (const args of [[], ['help'], ['--help'], ['-h']]) {
        out.length = 0
        expect(await main(args)).toBe(0)
        expect(out.join('')).toBe(HELP)
      }
    } finally {
      spy.mockRestore()
    }
  })

  it('prints the package version for version arguments', async () => {
    const out: string[] = []
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      out.push(String(s))
      return true
    })
    try {
      for (const args of [['version'], ['--version'], ['-v']]) {
        out.length = 0
        expect(await main(args)).toBe(0)
        expect(out.join('')).toBe(`${packageJson.version}\n`)
      }
    } finally {
      spy.mockRestore()
    }
  })

  it('reports unknown commands and exits 1', async () => {
    const err: string[] = []
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((s) => {
      err.push(String(s))
      return true
    })
    try {
      expect(await main(['wat'])).toBe(1)
      expect(err.join('')).toContain('unknown command "wat"')
      expect(err.join('')).toContain('Usage:')
    } finally {
      spy.mockRestore()
    }
  })

  it('buildTimelineFromPrompt is deterministic', () => {
    expect(JSON.stringify(buildTimelineFromPrompt('deploy with flyctl'))).toBe(
      JSON.stringify(buildTimelineFromPrompt('deploy with flyctl')),
    )
  })

  it('templates library lists built-in templates', () => {
    expect(listTemplateNames()).toEqual(['hero', 'install', 'demo', 'welcome'])
    for (const name of listTemplateNames()) {
      expect(TEMPLATES[name].description).toBeTruthy()
    }
  })

  it('buildTemplate is deterministic and schema-valid', () => {
    for (const name of listTemplateNames()) {
      const a = JSON.stringify(buildTemplate(name, { prompt: 'x' }))
      const b = JSON.stringify(buildTemplate(name, { prompt: 'x' }))
      expect(a).toBe(b)
      expect(safeParseTimeline(JSON.parse(a)).ok).toBe(true)
    }
  })

  it('buildTemplate rejects unknown templates', () => {
    expect(() => buildTemplate('nope')).toThrow(/unknown template/)
  })

  it('create --list-templates prints the catalog and exits 0', async () => {
    const out: string[] = []
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      out.push(String(s))
      return true
    })
    try {
      const code = await create(['--list-templates'])
      expect(code).toBe(0)
      const printed = out.join('')
      for (const name of listTemplateNames()) expect(printed).toContain(name)
    } finally {
      spy.mockRestore()
    }
  })

  it('create --template install is schema-valid and exits 0', async () => {
    const out: string[] = []
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      out.push(String(s))
      return true
    })
    try {
      const code = await create(['--template', 'install', '--no-tui'])
      expect(code).toBe(0)
      const t = JSON.parse(out.join(''))
      expect(safeParseTimeline(t).ok).toBe(true)
      expect(t.events.some((e: { type: string }) => e.type === 'type')).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })

  it('create --template unknown exits 1', async () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expect(await create(['--template', 'ghost', '--no-tui'])).toBe(1)
    } finally {
      spy.mockRestore()
    }
  })

  it('Studio preview renders partial and final materialized frames', () => {
    const timeline = buildTemplate('install', { physics: 'instant' })
    expect(frameAt(timeline, 0)).toBe('')
    expect(frameAt(timeline, 1)).toBe('$')
    expect(frameAt(timeline, 2)).toContain('$ npm i -g typeframe')
    expect(frameAt(timeline, timeline.events.length)).toBe(finalFrame(timeline))
  })

  it('Studio preview uses timeline event delays', () => {
    expect(eventDelay({ type: 'wait', duration: 250 })).toBe(250)
    expect(eventDelay({ type: 'type', text: 'x', delay: 12 })).toBe(12)
    expect(eventDelay({ type: 'output', text: 'x' })).toBe(30)
    expect(eventDelay({ type: 'clear' })).toBe(0)
  })

  it('exportTimeline writes svg, player html, and json artifacts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'typeframe-'))
    const t = buildTimelineFromPrompt('demo')
    const svgPath = await exportTimeline('svg', t, join(dir, 'a.svg'))
    const htmlPath = await exportTimeline('player', t, join(dir, 'a.html'))
    const jsonPath = await exportTimeline('json', t, join(dir, 'a.json'))
    expect(await readFile(svgPath, 'utf8')).toContain('<svg')
    expect(await readFile(htmlPath, 'utf8')).toContain('<terminal-player')
    expect(JSON.parse(await readFile(jsonPath, 'utf8')).version).toBe('1.0')
  })

  it('validateCmd rejects an invalid timeline with exit code 1', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'typeframe-'))
    const bad = join(dir, 'bad.json')
    await writeFile(bad, '{"version":"1.0"}')
    expect(await validateCmd([bad])).toBe(1)
  })

  it('validateCmd accepts a valid timeline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'typeframe-'))
    const good = join(dir, 'good.json')
    await writeFile(good, JSON.stringify(buildTimelineFromPrompt('ok')))
    expect(await validateCmd([good])).toBe(0)
  })
})
