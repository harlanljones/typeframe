import { execSync } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { exportTimeline } from '../src/commands/export.js'
import { buildTemplate } from '../src/templates/index.js'

beforeAll(() => {
  execSync('bun run build:player', { stdio: 'ignore' })
})

let dir: string
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'typeframe-render-'))
})

type PlayerEl = HTMLElement & { timeline: unknown; shadowRoot: ShadowRoot | null }

describe('exported artifacts render headlessly', () => {
  it('SVG parses, is marked as an image, and has text nodes', async () => {
    const tl = buildTemplate('demo')
    const svgPath = await exportTimeline('svg', tl, join(dir, 'a.svg'))
    const svg = await readFile(svgPath, 'utf8')
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const svgEl = doc.querySelector('svg')
    expect(svgEl).not.toBeNull()
    expect(svgEl?.getAttribute('role')).toBe('img')
    expect(doc.querySelectorAll('text').length).toBeGreaterThan(0)
  })

  it('player HTML mounts and renders rows without a validation error', async () => {
    const tl = buildTemplate('demo')
    const htmlPath = await exportTimeline('player', tl, join(dir, 'a.html'))
    const html = await readFile(htmlPath, 'utf8')
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const json = doc.querySelector('script[type="application/json"]')?.textContent ?? ''
    const el = document.createElement('terminal-player') as PlayerEl
    let errored = false
    el.addEventListener('tfp-error', () => {
      errored = true
    })
    document.body.appendChild(el)
    el.timeline = JSON.parse(json)
    expect(errored).toBe(false)
    expect(el.shadowRoot?.querySelectorAll('.tfp-row').length ?? 0).toBeGreaterThan(0)
    el.remove()
    // Self-contained: the bundle is inlined, not linked externally (SPEC §5).
    expect(html).toContain('<script type="module">')
    expect(html).not.toContain('src="./terminal-player.js"')
  })

  it('respects prefers-reduced-motion (static final frame, no error)', async () => {
    const original = window.matchMedia
    ;(window as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({
      matches: true,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })
    try {
      const tl = buildTemplate('demo')
      const rPath = await exportTimeline('player', tl, join(dir, 'r.html'))
      const html = await readFile(rPath, 'utf8')
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const json = doc.querySelector('script[type="application/json"]')?.textContent ?? ''
      const el = document.createElement('terminal-player') as PlayerEl
      let errored = false
      el.addEventListener('tfp-error', () => {
        errored = true
      })
      document.body.appendChild(el)
      el.timeline = JSON.parse(json)
      expect(errored).toBe(false)
      el.remove()
    } finally {
      ;(window as unknown as { matchMedia: unknown }).matchMedia = original
    }
  })
})
