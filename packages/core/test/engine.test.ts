import { describe, expect, it } from 'vitest'
import { ScreenState } from '../src/engine.js'
import type { TimelineEvent } from '../src/schema/timeline.js'

describe('ScreenState', () => {
  it('types characters and advances the cursor', () => {
    const s = new ScreenState(20, 4)
    s.type('hi', 0)
    expect(s.cursorRow).toBe(0)
    expect(s.cursorCol).toBe(2)
    expect(s.text()).toContain('hi')
  })

  it('backspace clears the previous cell', () => {
    const s = new ScreenState(20, 4)
    s.type('ho', 0)
    s.backspace(1)
    s.type('i', 5)
    expect(s.text()).toContain('hi')
  })

  it('output starts on a fresh line and ends with a newline', () => {
    const s = new ScreenState(20, 4)
    s.type('git status', 0)
    s.apply({ type: 'output', text: 'nothing to commit' }, 1)
    const rows = s.text().split('\n')
    expect(rows[0]).toBe('git status')
    expect(rows[1]).toBe('nothing to commit')
    expect(s.cursorRow).toBe(2)
  })

  it('stderr output uses the fallback color from options', () => {
    const s = new ScreenState(20, 4)
    s.apply({ type: 'output', text: 'boom', stream: 'stderr' }, 0, { stderrColor: '#ff0000' })
    const cells = [...s.cells()]
    expect(cells[0]?.cell.color).toBe('#ff0000')
  })

  it('clear resets the grid and cursor', () => {
    const s = new ScreenState(20, 4)
    s.type('junk', 0)
    s.apply({ type: 'clear' })
    expect(s.text()).toBe('')
    expect(s.cursorRow).toBe(0)
    expect(s.cursorCol).toBe(0)
  })

  it('scroll drops top lines', () => {
    const s = new ScreenState(20, 4)
    s.apply({ type: 'output', text: 'one' }, 0)
    s.apply({ type: 'output', text: 'two' }, 1)
    s.scroll(1)
    expect(s.text()).toContain('two')
    expect(s.text()).not.toContain('one')
  })

  it('prompt writes without a newline so typing continues on the same line', () => {
    const s = new ScreenState(20, 4)
    s.apply({ type: 'prompt', text: '$ ' })
    s.type('ls', 1)
    expect(s.text()).toBe('$ ls')
  })

  it('cursor events move and hide the cursor', () => {
    const s = new ScreenState(20, 4)
    s.apply({ type: 'cursor', row: 2, col: 3, visible: false } satisfies TimelineEvent)
    expect(s.cursorRow).toBe(2)
    expect(s.cursorCol).toBe(3)
    expect(s.cursorVisible).toBe(false)
  })
})
