import { describe, expect, it } from 'vitest'
import { parseTimeline, safeParseTimeline, timelineSchema } from '../src/schema/timeline.js'

const valid = {
  version: '1.0',
  meta: { theme: 'tokyo-night', windowStyle: 'none', dimensions: { width: 40, height: 8 } },
  events: [{ type: 'type', text: 'hi' }],
}

describe('timeline schema', () => {
  it('parses a valid timeline with defaults applied', () => {
    const t = parseTimeline(valid)
    expect(t.meta.physics).toBe('human')
    expect(t.events).toHaveLength(1)
  })

  it('accepts all four window styles including "none" (audit fix)', () => {
    for (const ws of ['macos', 'flat', 'minimal', 'none']) {
      expect(() =>
        parseTimeline({ ...valid, meta: { ...valid.meta, windowStyle: ws } }),
      ).not.toThrow()
    }
  })

  it('rejects an unknown window style', () => {
    const bad = { ...valid, meta: { ...valid.meta, windowStyle: 'steampunk' } }
    expect(() => parseTimeline(bad)).toThrow()
  })

  it('rejects output events without text or spans', () => {
    const bad = { ...valid, events: [{ type: 'output' }] }
    const res = safeParseTimeline(bad)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.message).toContain('output')
  })

  it('accepts rich spans on output events', () => {
    const t = parseTimeline({
      ...valid,
      events: [{ type: 'output', spans: [{ text: 'ok', color: '#0dbc79', bold: true }] }],
    })
    expect(t.events[0]?.type).toBe('output')
  })

  it('rejects wrong schema version', () => {
    expect(() => parseTimeline({ ...valid, version: '2.0' })).toThrow()
  })

  it('backspace count defaults to 1', () => {
    const t = parseTimeline({ ...valid, events: [{ type: 'backspace' }] })
    expect(timelineSchema.parse(t).events[0]).toMatchObject({ type: 'backspace', count: 1 })
  })
})
