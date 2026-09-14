import { readFile } from 'node:fs/promises'
import { safeParseTimeline } from '@typeframe/core'

export async function validateCmd(args: string[]): Promise<number> {
  const file = args[0]
  if (!file) {
    process.stderr.write('usage: typeframe validate <file>\n')
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
  const res = safeParseTimeline(json)
  if (!res.ok) {
    process.stderr.write(`✖ ${file} failed schema validation:\n`)
    for (const issue of res.error.issues) process.stderr.write(`  - ${JSON.stringify(issue)}\n`)
    return 1
  }
  process.stdout.write(`✔ ${file} is a valid TypeFrame timeline (v${res.timeline.version})\n`)
  return 0
}
