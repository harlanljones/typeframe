import {
  listThemes,
  materialize,
  PHYSICS_MODES,
  type PhysicsMode,
  ScreenState,
  type TerminalTimeline,
  type TimelineEvent,
  WINDOW_STYLES,
  type WindowStyle,
} from '@typeframe/core'
import { Box, render, Text, useInput } from 'ink'
import { useEffect, useMemo, useState } from 'react'
import { type ExportFormat, exportTimeline } from '../commands/export.js'

export interface StudioProps {
  timeline: TerminalTimeline
  onExport: (format: ExportFormat, timeline: TerminalTimeline) => void
}

const EXPORT_LABELS: Record<ExportFormat, string> = {
  svg: '1: export SVG',
  player: '2: export player',
  json: '3: export JSON',
}

function cycle(list: readonly string[], cur: string): string {
  const i = list.indexOf(cur)
  return list[(i + 1) % list.length] ?? cur
}

export function frameAt(timeline: TerminalTimeline, eventCount: number): string {
  const s = new ScreenState(timeline.meta.dimensions.width, timeline.meta.dimensions.height)
  for (const ev of materialize(timeline).slice(0, eventCount)) s.apply(ev)
  return s.text()
}

/** Final-frame preview from the same pipeline the exporters use (no drift). */
export function finalFrame(timeline: TerminalTimeline): string {
  return frameAt(timeline, Number.POSITIVE_INFINITY)
}

export function eventDelay(event: TimelineEvent): number {
  if (event.type === 'wait') return event.duration
  if (event.type === 'type') return event.delay ?? 60
  if (event.type === 'output') return event.delay ?? 30
  return 0
}

export function Studio({ timeline: initial, onExport }: StudioProps) {
  const [theme, setTheme] = useState(initial.meta.theme)
  const [chrome, setChrome] = useState<WindowStyle>(initial.meta.windowStyle)
  const [physics, setPhysics] = useState<PhysicsMode>(initial.meta.physics)
  const timeline = useMemo(
    () => ({
      ...initial,
      meta: { ...initial.meta, theme, windowStyle: chrome, physics },
    }),
    [initial, theme, chrome, physics],
  )
  const events = useMemo(() => materialize(timeline), [timeline])
  const [eventIndex, setEventIndex] = useState(events.length)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    if (eventIndex >= events.length) {
      setPlaying(false)
      return
    }
    const delay = eventIndex === 0 ? 0 : eventDelay(events[eventIndex - 1] as TimelineEvent)
    const timer = setTimeout(() => setEventIndex((index) => index + 1), delay)
    return () => clearTimeout(timer)
  }, [eventIndex, events, playing])

  useInput((input, key) => {
    if (key.escape || input === 'q') process.exit(0)
    if (input === 't') setTheme((v) => cycle(listThemes(), v))
    if (input === 'c') setChrome((v) => cycle(WINDOW_STYLES, v) as WindowStyle)
    if (input === 'p') {
      setPhysics((v) => cycle(PHYSICS_MODES, v) as PhysicsMode)
      setPlaying(false)
      setEventIndex(Number.POSITIVE_INFINITY)
    }
    if (input === ' ') {
      if (playing) setPlaying(false)
      else {
        if (eventIndex >= events.length) setEventIndex(0)
        setPlaying(true)
      }
    }
    if (input === 'r') {
      setEventIndex(0)
      setPlaying(true)
    }
    if (input === '1' || input === '2' || input === '3') {
      const format: ExportFormat = input === '1' ? 'svg' : input === '2' ? 'player' : 'json'
      onExport(format, timeline)
      process.exit(0)
    }
  })

  const frame = frameAt(timeline, eventIndex)
  const progress = Math.min(eventIndex, events.length)

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text>{frame}</Text>
      </Box>
      <Text>
        theme <Text color="cyan">{theme}</Text> · chrome <Text color="cyan">{chrome}</Text> ·
        physics <Text color="cyan">{physics}</Text>
      </Text>
      <Text>
        preview <Text color={playing ? 'green' : 'yellow'}>{playing ? 'playing' : 'paused'}</Text>{' '}
        <Text dimColor>
          {progress}/{events.length}
        </Text>
      </Text>
      <Text dimColor>
        space play/pause · r restart · {Object.values(EXPORT_LABELS).join(' · ')} · t/c/p options ·
        q quit
      </Text>
    </Box>
  )
}

export async function runStudio(timeline: TerminalTimeline): Promise<void> {
  await new Promise<void>((resolve) => {
    const instance = render(
      <Studio
        timeline={timeline}
        onExport={(format, t) => {
          void exportTimeline(format, t).then((path) => {
            process.stdout.write(`✔ wrote ${path}\n`)
          })
        }}
      />,
    )
    void instance.waitUntilExit().then(() => resolve())
  })
}
