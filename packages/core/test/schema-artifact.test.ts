import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { buildTimelineSchema } from '../scripts/build-schema.js'

const EXAMPLES = ['hero.json', 'docker-retry.json']

describe('json schema artifact', () => {
  it('is generated from the zod schema with a frozen version constraint', () => {
    const schema = buildTimelineSchema() as {
      properties: { version: { const: string } }
    }
    expect(schema.properties.version.const).toBe('1.0')
  })

  it('validates every example timeline (artifact stays in sync with zod)', async () => {
    const schema = buildTimelineSchema()
    const validate = new Ajv().compile(schema)
    for (const name of EXAMPLES) {
      const data = JSON.parse(await readFile(join(process.cwd(), 'examples', name), 'utf8'))
      expect(validate(data), `${name} should satisfy the JSON Schema`).toBe(true)
    }
  })
})
