import {
  listThemes,
  materialize,
  PHYSICS_MODES,
  type PhysicsMode,
  ScreenState,
  type TerminalTimeline,
  WINDOW_STYLES,
  type WindowStyle,
} from '@typeframe/core'
import { Box, render, Text, useInput } from 'ink'
import { useState } from 'react'
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

/** Final-frame preview from the same pipeline the exporters use (no drift). */
export function finalFrame(timeline: TerminalTimeline): string {
  const s = new ScreenState(timeline.meta.dimensions.width, timeline.meta.dimensions.height)
  for (const ev of materialize(timeline)) s.apply(ev)
  return s.text()
}

export function Studio({ timeline: initial, onExport }: StudioProps) {
  const [timeline, setTimeline] = useState(initial)
  const [theme, setTheme] = useState(initial.meta.theme)
  const [chrome, setChrome] = useState<WindowStyle>(initial.meta.windowStyle)
  const [physics, setPhysics] = useState<PhysicsMode>(initial.meta.physics)

  useInput((input, key) => {
    if (key.escape || input === 'q') process.exit(0)
    if (input === 't') setTheme((v) => cycle(listThemes(), v))
    if (input === 'c') setChrome((v) => cycle(WINDOW_STYLES, v) as WindowStyle)
    if (input === 'p') setPhysics((v) => cycle(PHYSICS_MODES, v) as PhysicsMode)
    if (input === '1' || input === '2' || input === '3') {
      const format: ExportFormat = input === '1' ? 'svg' : input === '2' ? 'player' : 'json'
      setTimeline((prev) => ({
        ...prev,
        meta: { ...prev.meta, theme, windowStyle: chrome, physics },
      }))
      onExport(format, {
        ...timeline,
        meta: { ...timeline.meta, theme, windowStyle: chrome, physics },
      })
      process.exit(0)
    }
  })

  const frame = finalFrame({
    ...timeline,
    meta: { ...timeline.meta, theme, windowStyle: chrome, physics },
  })

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        {/* Static terminal lines — content-derived keys, stable for this read-only snapshot. */}
        {frame.split('\n').map((line, _i) => (
          <Text key={line}>{line}</Text>
        ))}
      </Box>
      <Text>
        theme <Text color="cyan">{theme}</Text> · chrome <Text color="cyan">{chrome}</Text> ·
        physics <Text color="cyan">{physics}</Text>
      </Text>
      <Text dimColor>
        {Object.values(EXPORT_LABELS).join(' · ')} · t/c/p cycle options · q quit
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
