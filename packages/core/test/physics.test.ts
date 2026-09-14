import { describe, expect, it } from 'vitest'
import { materialize, mulberry32 } from '../src/physics/index.js'
import { parseTimeline } from '../src/schema/timeline.js'

const base = {
  version: '1.0' as const,
  meta: {
    theme: 'tokyo-night',
    windowStyle: 'macos' as const,
    dimensions: { width: 40, height: 8 },
    physics: 'human' as const,
    seed: 42,
  },
  events: [{ type: 'type' as const, text: 'git push origin main' }],
}

describe('physics materialization', () => {
  it('instant mode leaves events untouched', () => {
    const t = parseTimeline({ ...base, meta: { ...base.meta, physics: 'instant' } })
    expect(materialize(t)).toEqual(t.events)
  })

  it('burst mode emits one fast type event', () => {
    const t = parseTimeline({ ...base, meta: { ...base.meta, physics: 'burst' } })
    const events = materialize(t)
    expect(events).toEqual([{ type: 'type', text: 'git push origin main', delay: 8 }])
  })

  it('human mode is deterministic for a given seed', () => {
    const t = parseTimeline(base)
    expect(JSON.stringify(materialize(t))).toBe(JSON.stringify(materialize(t)))
  })

  it('different seeds produce different streams', () => {
    const a = JSON.stringify(materialize(parseTimeline(base)))
    const b = JSON.stringify(
      materialize(parseTimeline({ ...base, meta: { ...base.meta, seed: 43 } })),
    )
    expect(a).not.toBe(b)
  })

  it('human mode can emit typo+backspace corrections', () => {
    const t = parseTimeline({ ...base, meta: { ...base.meta, seed: 7 } })
    const events = materialize(t)
    expect(events.some((e) => e.type === 'backspace')).toBe(true)
  })

  it('mulberry32 is stable', () => {
    const a = mulberry32(1)
    const b = mulberry32(1)
    expect(a()).toBe(b())
  })
})
