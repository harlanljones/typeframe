import { execSync } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { safeParseTimeline } from '@typeframe/core'
import { describe, expect, it } from 'vitest'
import { parseRecording, recordCmd } from '../src/record/pty.js'

const SAMPLE_OUT = [
  'Script started on 2026-01-01 [COMMAND="echo hi" <not executed on terminal>]',
  '',
  'hi\r',
  'world\r',
  '',
  'Script done on 2026-01-01 [COMMAND_EXIT_CODE="0"]',
  '',
].join('\n')

describe('pty recording', () => {
  it('parseRecording turns a script capture into a valid timeline', () => {
    const tl = parseRecording(SAMPLE_OUT, '0.010 3\n0.120 6', 'echo hi')
    expect(safeParseTimeline(tl).ok).toBe(true)
    const typeEvent = tl.events.find((e) => e.type === 'type')
    expect(typeEvent && 'text' in typeEvent && typeEvent.text).toBe('echo hi')
    const outputs = tl.events.filter((e) => e.type === 'output').map((e) => 'text' in e && e.text)
    expect(outputs).toEqual(['hi', 'world'])
  })

  it('parseRecording strips ANSI and drops blank lines', () => {
    const out = [
      'Script started on 2026 [COMMAND="x" <not executed on terminal>]',
      '\x1b[32mgreen\x1b[0m\r',
      'Script done on 2026 [COMMAND_EXIT_CODE="0"]',
    ].join('\n')
    const tl = parseRecording(out, '0.01 10', 'x')
    const outputs = tl.events.filter((e) => e.type === 'output').map((e) => 'text' in e && e.text)
    expect(outputs).toEqual(['green'])
  })

  it('recordCmd reports usage with no command', async () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expect(await recordCmd([])).toBe(1)
    } finally {
      spy.mockRestore()
    }
  })

  it('recordCmd captures a real command into a valid timeline', async () => {
    let hasScript = true
    try {
      execSync('command -v script')
    } catch {
      hasScript = false
    }
    if (!hasScript) return // Unix-first; skip where `script` is unavailable

    const dir = await mkdtemp(join(tmpdir(), 'typeframe-rec-'))
    const out = join(dir, 't.json')
    const code = await recordCmd(['-o', out, '--', 'echo', 'captured-line'])
    expect(code).toBe(0)
    const tl = JSON.parse(await readFile(out, 'utf8'))
    expect(safeParseTimeline(tl).ok).toBe(true)
    const outputs = tl.events
      .filter((e: { type: string }) => e.type === 'output')
      .map((e: { text?: string }) => e.text)
    expect(outputs).toContain('captured-line')
  })
})
