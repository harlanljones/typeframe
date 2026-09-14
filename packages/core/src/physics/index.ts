import type { PhysicsMode, TerminalTimeline, TimelineEvent } from '../schema/timeline.js'

export const DEFAULT_TYPE_DELAY_MS = 60

/** Deterministic PRNG (mulberry32) — exports must be reproducible from the same seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Expand timeline events according to the physics mode:
 * - "human": per-character delays with jitter and occasional typo+backspace (seeded, deterministic)
 * - "burst": one fast stream per type event
 * - "instant": events unchanged
 */
export function materialize(timeline: TerminalTimeline): TimelineEvent[] {
  const mode: PhysicsMode = timeline.meta.physics
  if (mode === 'instant') return [...timeline.events]

  const rand = mulberry32(timeline.meta.seed ?? 0xc0ffee)
  const out: TimelineEvent[] = []

  for (const ev of timeline.events) {
    if (ev.type !== 'type') {
      out.push(ev)
      continue
    }
    const base = ev.delay ?? DEFAULT_TYPE_DELAY_MS

    if (mode === 'burst') {
      out.push({ type: 'type', text: ev.text, delay: Math.max(8, Math.round(base / 8)) })
      continue
    }

    for (const ch of ev.text) {
      if (ev.text.length > 2 && rand() < 0.04) {
        const typo = ch === 'a' ? 's' : 'a'
        out.push({ type: 'type', text: typo, delay: 40 })
        out.push({ type: 'wait', duration: 90 })
        out.push({ type: 'backspace', count: 1 })
      }
      out.push({ type: 'type', text: ch, delay: Math.round(base * (0.5 + rand())) })
    }
  }
  return out
}
