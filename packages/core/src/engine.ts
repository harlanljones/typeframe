import type { TimelineEvent } from './schema/timeline.js'

export interface StyledCell {
  ch: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  /** ms timestamp when this cell appeared (set by renderers via apply) */
  stamp: number
  kind: 'typed' | 'out' | 'prompt'
}

export type Cell = StyledCell | null

export interface ApplyOptions {
  /** fallback color for `stream: "stderr"` output when the event has no explicit color */
  stderrColor?: string
}

/**
 * Shared screen model consumed by the SVG exporter, the web player, and the
 * TUI preview — one renderer pipeline, no fidelity drift (audit Q7).
 */
export class ScreenState {
  readonly cols: number
  readonly rows: number
  grid: Cell[][]
  cursorRow = 0
  cursorCol = 0
  cursorVisible = true

  constructor(cols: number, rows: number) {
    this.cols = cols
    this.rows = rows
    this.grid = ScreenState.blank(cols, rows)
  }

  static blank(cols: number, rows: number): Cell[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))
  }

  reset(): void {
    this.grid = ScreenState.blank(this.cols, this.rows)
    this.cursorRow = 0
    this.cursorCol = 0
  }

  put(ch: string, stamp: number, kind: StyledCell['kind'], style: Partial<StyledCell> = {}): void {
    if (this.cursorCol >= this.cols) {
      this.cursorRow++
      this.cursorCol = 0
    }
    if (
      this.cursorRow < 0 ||
      this.cursorRow >= this.rows ||
      this.cursorCol < 0 ||
      this.cursorCol >= this.cols
    )
      return
    this.grid[this.cursorRow][this.cursorCol] = {
      ch,
      stamp,
      kind,
      color: style.color,
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
    }
    this.cursorCol++
  }

  newline(): void {
    this.cursorRow++
    this.cursorCol = 0
  }

  backspace(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.cursorCol > 0) {
        this.cursorCol--
      } else if (this.cursorRow > 0) {
        this.cursorRow--
        this.cursorCol = this.cols - 1
      } else {
        break
      }
      const row = this.grid[this.cursorRow]
      if (row) row[this.cursorCol] = null
    }
  }

  write(
    text: string,
    stamp: number,
    kind: StyledCell['kind'],
    style: Partial<StyledCell> = {},
  ): void {
    for (const ch of text) {
      if (ch === '\n') {
        this.newline()
        continue
      }
      this.put(ch, stamp, kind, style)
    }
  }

  /** Convenience: type plain characters with default styling. */
  type(text: string, stamp: number): void {
    this.write(text, stamp, 'typed')
  }

  outputLine(text: string, stamp: number, style: Partial<StyledCell> = {}): void {
    if (this.cursorCol > 0) this.newline()
    this.write(text, stamp, 'out', style)
    this.newline()
  }

  scroll(lines: number): void {
    for (let i = 0; i < lines; i++) {
      this.grid.shift()
      this.grid.push(Array.from({ length: this.cols }, () => null))
    }
    this.cursorRow = Math.max(0, this.cursorRow - lines)
  }

  apply(ev: TimelineEvent, stamp = 0, opts: ApplyOptions = {}): void {
    switch (ev.type) {
      case 'type':
        this.write(ev.text, stamp, 'typed')
        break
      case 'backspace':
        this.backspace(ev.count)
        break
      case 'output': {
        const style: Partial<StyledCell> = {
          color: ev.color ?? (ev.stream === 'stderr' ? opts.stderrColor : undefined),
        }
        if (ev.spans) {
          if (this.cursorCol > 0) this.newline()
          for (const span of ev.spans) this.write(span.text, stamp, 'out', span)
          this.newline()
        } else if (ev.text !== undefined) {
          this.outputLine(ev.text, stamp, style)
        }
        break
      }
      case 'prompt':
        this.write(ev.text, stamp, 'prompt', { bold: true })
        break
      case 'clear':
        this.reset()
        break
      case 'scroll':
        this.scroll(ev.lines)
        break
      case 'cursor':
        if (ev.row !== undefined) this.cursorRow = Math.min(ev.row, this.rows - 1)
        if (ev.col !== undefined) this.cursorCol = Math.min(ev.col, this.cols - 1)
        if (ev.visible !== undefined) this.cursorVisible = ev.visible
        break
      case 'wait':
        break
    }
  }

  /** Plain-text snapshot (TUI preview, clipboard copy, alt text). Trailing blank rows are dropped. */
  text(): string {
    const lines = this.grid.map((row) =>
      row
        .map((c) => c?.ch ?? ' ')
        .join('')
        .trimEnd(),
    )
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    return lines.join('\n')
  }

  *cells(): Generator<{ row: number; col: number; cell: StyledCell }> {
    for (let r = 0; r < this.rows; r++) {
      const gridRow = this.grid[r]
      if (!gridRow) continue
      for (let c = 0; c < this.cols; c++) {
        const cell = gridRow[c]
        if (cell) yield { row: r, col: c, cell }
      }
    }
  }
}
