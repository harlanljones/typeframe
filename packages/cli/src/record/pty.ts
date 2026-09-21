/**
 * pty recording (PRD §4.1 "Real Terminal Recording").
 *
 * Unix-first via the util-linux `script` utility (no native deps). Windows/ConPTY
 * is a tracked follow-up. Security note from the audit: recorded sessions can
 * contain secrets, so a redaction/review warning is printed on every recording.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseTimeline, type TerminalTimeline } from '@typeframe/core'

/* biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is the ANSI introducer */
const CSI = /\x1b\[[0-9;?]*[A-Za-z]/g

/** Strip ANSI SGR sequences from raw captured output. */
function stripAnsi(s: string): string {
  return s.replace(CSI, '')
}

/** Drop the `Script started …` header and `Script done …` footer that script adds.
 * Markers are absent under `script -q` (notably BSD/macOS): fall back to the
 * whole capture instead of an empty slice. */
function extractChildOutput(out: string): string {
  const lines = out.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Script started')) {
      start = i
      break
    }
  }
  let end = lines.length
  for (let i = lines.length - 1; i > start; i--) {
    if (lines[i].startsWith('Script done')) {
      end = i
      break
    }
  }
  return lines.slice(start + 1, end).join('\n')
}

/** First timing delay (ms) — the pause before the first command output appears. */
function firstDelayMs(timing: string): number {
  for (const line of timing.split('\n')) {
    const t = line.trim()
    if (!t) continue
    const d = Number.parseFloat(t.split(/\s+/)[0] ?? '')
    if (Number.isFinite(d)) return Math.min(Math.round(d * 1000), 2000)
  }
  return 200
}

/**
 * Turn captured `script` output + timing into a TypeFrame timeline.
 * Unix-first: the command is replayed as typed input, then each captured output
 * line is emitted as an `output` event with a small reveal gap.
 */
export function parseRecording(out: string, timing: string, command: string): TerminalTimeline {
  const raw = stripAnsi(extractChildOutput(out)).replace(/\r/g, '')
  const lines = raw.split('\n').map((l) => l.replace(/\s+$/, ''))
  while (lines.length && lines[0] === '') lines.shift()
  while (lines.length && lines[lines.length - 1] === '') lines.pop()

  const events: TerminalTimeline['events'] = [
    { type: 'prompt', text: '$ ' },
    { type: 'type', text: command, delay: 55 },
    { type: 'wait', duration: firstDelayMs(timing) },
  ]
  for (const line of lines) {
    events.push({ type: 'wait', duration: 120 })
    events.push({ type: 'output', text: line })
  }

  return parseTimeline({
    version: '1.0',
    meta: {
      theme: 'tokyo-night',
      windowStyle: 'macos',
      dimensions: { width: 80, height: 24 },
      physics: 'burst',
      seed: 1337,
      title: `recorded: ${command}`.slice(0, 60),
    },
    events,
  })
}

function runScript(cmd: string[], outPath: string, timingPath: string): Promise<number> {
  return new Promise((resolve) => {
    const commandStr = cmd.join(' ')
    // macOS (BSD script) vs Linux (GNU script) have different option syntax.
    // BSD: script [-q] [file] [-- command ...]
    // GNU: script -q --log-out file --log-timing file -c command
    const args =
      process.platform === 'darwin'
        ? ['-q', outPath, '--', 'sh', '-c', commandStr]
        : ['-q', '--log-out', outPath, '--log-timing', timingPath, '-c', commandStr]
    const child = spawn('script', args, { stdio: 'inherit' })
    child.on('error', () => resolve(127))
    child.on('close', (code) => resolve(code ?? 0))
  })
}

export async function recordCmd(args: string[]): Promise<number> {
  const sep = args.indexOf('--')
  const ownArgs = sep >= 0 ? args.slice(0, sep) : args
  const cmd = sep >= 0 ? args.slice(sep + 1) : []
  if (cmd.length === 0) {
    process.stderr.write('usage: typeframe record [--output file] -- <command> [args...]\n')
    return 1
  }
  if (process.platform === 'win32') {
    process.stderr.write('⚠ pty recording needs ConPTY on Windows — Unix-first, tracked issue.\n')
    return 1
  }

  const outFlag = ownArgs.indexOf('-o')
  const target = outFlag >= 0 ? ownArgs[outFlag + 1] : undefined

  const dir = await mkdtemp(join(tmpdir(), 'typeframe-record-'))
  const outPath = join(dir, 'out.txt')
  const timingPath = join(dir, 'timing.txt')
  const code = await runScript(cmd, outPath, timingPath)
  if (code === 127) {
    process.stderr.write('✖ `script` (util-linux) is required for recording and was not found.\n')
    return 1
  }

  const out = await readFile(outPath, 'utf8')
  let timing: string
  try {
    timing = await readFile(timingPath, 'utf8')
  } catch {
    // On macOS (BSD script), timing file isn't generated. Generate synthetic timing.
    const lines = extractChildOutput(stripAnsi(out))
      .split('\n')
      .filter((l) => l.trim())
    timing = lines.map((_, i) => `${0.12 * (i + 1)} ${Math.random() * 50}`).join('\n')
  }
  const timeline = parseRecording(out, timing, cmd.join(' '))

  process.stderr.write(
    '\n⚠ SECURITY: this recording may contain secrets (tokens, passwords, paths).\n' +
      '  Review and redact the timeline before exporting or sharing it.\n',
  )

  const body = `${JSON.stringify(timeline, null, 2)}\n`
  if (target) {
    await writeFile(target, body)
    process.stdout.write(`✔ wrote ${target}\n`)
  } else {
    process.stdout.write(body)
  }
  return 0
}
