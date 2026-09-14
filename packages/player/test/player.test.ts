import { parseTimeline } from '@typeframe/core'
import { describe, expect, it } from 'vitest'
import { playerHTML, TerminalPlayer } from '../src/terminal-player.js'

const timeline = parseTimeline({
  version: '1.0',
  meta: {
    theme: 'nord',
    windowStyle: 'none',
    dimensions: { width: 20, height: 3 },
    physics: 'instant',
  },
  events: [
    { type: 'prompt', text: '$ ' },
    { type: 'type', text: 'ls', delay: 10 },
    { type: 'output', text: 'a b c' },
  ],
})

describe('terminal-player', () => {
  it('registers the custom element on import', () => {
    expect(customElements.get('terminal-player')).toBe(TerminalPlayer)
  })

  it('builds a shadow DOM with controls and renders rows', () => {
    const el = document.createElement('terminal-player') as TerminalPlayer
    document.body.appendChild(el)
    el.timeline = timeline
    expect(el.shadowRoot).not.toBeNull()
    expect(el.shadowRoot?.querySelector('.tfp-toggle')).not.toBeNull()
    el.restart()
    expect(el.shadowRoot?.querySelectorAll('.tfp-row').length).toBe(3)
    el.remove()
  })

  it('rejects invalid timelines with a tfp-error event', () => {
    const el = document.createElement('terminal-player') as TerminalPlayer
    document.body.appendChild(el)
    let errored = false
    el.addEventListener('tfp-error', () => {
      errored = true
    })
    el.setTimeline({ version: '9.9' })
    expect(errored).toBe(true)
    expect(el.timeline).toBeNull()
    el.remove()
  })

  it('generates embeddable HTML with script-safe JSON', () => {
    const evil = parseTimeline({
      ...timeline,
      events: [{ type: 'output', text: '</script><script>alert(1)</script>' }],
    })
    const html = playerHTML(evil)
    expect(html).toContain('<terminal-player')
    expect(html).toContain('application/json')
    // The payload's "</script>" must be escaped; only the two real closers remain.
    expect(html).toContain('\\u003c/script')
    expect(html.match(/<\/script>/g)?.length).toBe(2)
  })

  it('inlines js when opts.js is provided', () => {
    const html = playerHTML(timeline, { js: 'console.log(1)' })
    expect(html).toContain('<script type="module">console.log(1)</script>')
    expect(html).not.toContain('src=')
  })

  it('falls back to an external src when no js is given', () => {
    const html = playerHTML(timeline)
    expect(html).toContain('<script type="module" src="./terminal-player.js"></script>')
  })
})
