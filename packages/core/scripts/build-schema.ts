/**
 * Generate the published JSON Schema artifact from the zod source of truth
 * (../src/schema/timeline.ts). SPEC v1.1 §3: the JSON Schema is published
 * alongside the zod schema. Uses zod v4's built-in toJSONSchema.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { timelineSchema } from '../src/schema/timeline.js'

export function buildTimelineSchema(): Record<string, unknown> {
  return z.toJSONSchema(timelineSchema, { target: 'draft-07', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >
}

const meta = import.meta as unknown as { main?: boolean }
if (meta.main) {
  const schema = buildTimelineSchema()
  const out = new URL('../../../schema/timeline.schema.json', import.meta.url)
  await mkdir(new URL('../../../schema/', import.meta.url), { recursive: true })
  await writeFile(out, `${JSON.stringify(schema, null, 2)}\n`)
  console.log(`✔ wrote ${out.pathname}`)
}
