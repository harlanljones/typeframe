import { describe, expect, it } from 'vitest'
import { parseAnsi } from '../src/ansi/parser.js'

describe('ansi parser', () => {
  it('passes plain text through as one span', () => {
    expect(parseAnsi('hello')).toEqual([{ text: 'hello' }])
  })

  it('maps SGR foreground colors', () => {
    const spans = parseAnsi('\x1b[31merr\x1b[0m ok')
    expect(spans).toEqual([{ text: 'err', color: '#cd3131' }, { text: ' ok' }])
  })

  it('tracks bold/italic/underline', () => {
    const spans = parseAnsi('\x1b[1;4mbold underline\x1b[0m normal')
    expect(spans[0]).toMatchObject({ bold: true, underline: true })
    expect(spans[0]?.text).toBe('bold underline')
    expect(spans[1]).toEqual({ text: ' normal' })
  })

  it('strips non-SGR escape sequences', () => {
    expect(parseAnsi('\x1b[2J\x1b[Ha')).toEqual([{ text: 'a' }])
  })

  it('handles bright colors', () => {
    expect(parseAnsi('\x1b[92mbright')[0]?.color).toBe('#23d18b')
  })
})
