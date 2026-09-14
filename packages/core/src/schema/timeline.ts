import { z } from 'zod'

export const SCHEMA_VERSION = '1.0' as const

export const WINDOW_STYLES = ['macos', 'flat', 'minimal', 'none'] as const
export const PHYSICS_MODES = ['human', 'burst', 'instant'] as const

export const windowStyleSchema = z.enum(WINDOW_STYLES)
export const physicsSchema = z.enum(PHYSICS_MODES)

export const richSpanSchema = z.object({
  text: z.string().min(1),
  color: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
})

export const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('type'),
    text: z.string(),
    delay: z.number().int().nonnegative().optional(),
  }),
  z.object({ type: z.literal('wait'), duration: z.number().int().nonnegative() }),
  z.object({
    type: z.literal('output'),
    text: z.string().optional(),
    spans: z.array(richSpanSchema).optional(),
    stream: z.enum(['stdout', 'stderr']).optional(),
    color: z.string().optional(),
    delay: z.number().int().nonnegative().optional(),
  }),
  z.object({ type: z.literal('clear') }),
  z.object({
    type: z.literal('cursor'),
    row: z.number().int().nonnegative().optional(),
    col: z.number().int().nonnegative().optional(),
    visible: z.boolean().optional(),
  }),
  z.object({ type: z.literal('backspace'), count: z.number().int().positive().default(1) }),
  z.object({ type: z.literal('prompt'), text: z.string() }),
  z.object({ type: z.literal('scroll'), lines: z.number().int().positive() }),
])

export const timelineSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  meta: z.object({
    theme: z.string().min(1),
    windowStyle: windowStyleSchema,
    dimensions: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    physics: physicsSchema.default('human'),
    seed: z.number().int().optional(),
    title: z.string().optional(),
  }),
  events: z.array(eventSchema),
})

export type RichSpan = z.infer<typeof richSpanSchema>
export type TimelineEvent = z.infer<typeof eventSchema>
export type WindowStyle = z.infer<typeof windowStyleSchema>
export type PhysicsMode = z.infer<typeof physicsSchema>
export type TimelineMeta = z.infer<typeof timelineSchema>['meta']
export type TerminalTimeline = z.infer<typeof timelineSchema>

export class TimelineValidationError extends Error {
  readonly issues: unknown[]

  constructor(issues: unknown[]) {
    super(`Invalid timeline: ${JSON.stringify(issues)}`)
    this.name = 'TimelineValidationError'
    this.issues = issues
  }
}

export function parseTimeline(input: unknown): TerminalTimeline {
  const parsed = timelineSchema.safeParse(input)
  if (!parsed.success) {
    throw new TimelineValidationError(parsed.error.issues)
  }
  for (const [i, ev] of parsed.data.events.entries()) {
    if (ev.type === 'output' && ev.text === undefined && ev.spans === undefined) {
      throw new TimelineValidationError([
        { path: `events[${i}]`, message: 'output event requires "text" or "spans"' },
      ])
    }
  }
  return parsed.data
}

export function safeParseTimeline(
  input: unknown,
): { ok: true; timeline: TerminalTimeline } | { ok: false; error: TimelineValidationError } {
  try {
    return { ok: true, timeline: parseTimeline(input) }
  } catch (err) {
    if (err instanceof TimelineValidationError) return { ok: false, error: err }
    throw err
  }
}
