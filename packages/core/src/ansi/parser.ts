/* biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is the ANSI introducer */
const CSI = /\[[0-9;?]*[A-Za-z]/g

/** Parse a raw ANSI string into styled spans. Non-SGR escape sequences are dropped. */
export interface AnsiSpan {
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

const FG: Record<number, string> = {
  30: '#000000',
  31: '#cd3131',
  32: '#0dbc79',
  33: '#e5e510',
  34: '#2472c8',
  35: '#bc3fbc',
  36: '#11a8cd',
  37: '#e5e5e5',
  90: '#666666',
  91: '#f14c4c',
  92: '#23d18b',
  93: '#f5f543',
  94: '#3b8eea',
  95: '#d670d6',
  96: '#29b8db',
  97: '#ffffff',
}

export function parseAnsi(input: string): AnsiSpan[] {
  const spans: AnsiSpan[] = []
  let cur: AnsiSpan = { text: '' }
  let last = 0

  for (const m of input.matchAll(CSI)) {
    const start = m.index ?? 0
    if (start > last) cur.text += input.slice(last, start)
    last = start + m[0].length
    if (!m[0].endsWith('m')) continue // non-SGR sequence (cursor move, clear, …): ignored

    const params = m[0].slice(2, -1)
    for (const p of params.split(';')) {
      const code = p === '' ? 0 : Number.parseInt(p, 10)
      if (Number.isNaN(code)) continue
      if (code === 0) {
        if (cur.text) spans.push(cur)
        cur = { text: '' }
      } else if (code === 1) {
        cur.bold = true
      } else if (code === 3) {
        cur.italic = true
      } else if (code === 4) {
        cur.underline = true
      } else if (code === 22) {
        cur.bold = false
      } else if (code === 23) {
        cur.italic = false
      } else if (code === 24) {
        cur.underline = false
      } else if (code in FG) {
        cur.color = FG[code]
      } else if (code === 39) {
        cur.color = undefined
      }
    }
  }

  cur.text += input.slice(last)
  if (cur.text) spans.push(cur)
  return spans
}
