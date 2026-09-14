import { materialize, ScreenState, type TerminalTimeline } from '@typeframe/core/lite'

const TAG = 'terminal-player'

// The player only runs in a browser DOM. In Node (headless CLI builds, CI)
// `HTMLElement` is undefined, so alias the base to a no-op class to keep the
// module importable; the element is only ever instantiated in a real DOM.
const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement)

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function shell(): string {
  return (
    `<style>` +
    `:host{display:inline-block;background:#1a1b26;color:#a9b1d6;border-radius:10px;padding:12px;` +
    `font:13px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;min-width:320px}` +
    `.tfp-bar{display:flex;gap:6px;margin-bottom:8px}` +
    `button{background:#ffffff14;color:inherit;border:1px solid #ffffff2a;border-radius:6px;padding:2px 10px;cursor:pointer;font:inherit}` +
    `.tfp-screen{white-space:pre;overflow:auto}` +
    `</style>` +
    `<div class="tfp-bar" role="toolbar" aria-label="terminal player controls">` +
    `<button class="tfp-toggle" aria-label="play or pause">▶</button>` +
    `<button class="tfp-restart" aria-label="restart">↺</button>` +
    `<button class="tfp-copy" aria-label="copy text">⧉</button>` +
    `</div>` +
    `<div class="tfp-screen" aria-live="off"></div>`
  )
}

/**
 * Lightweight shape check for embed-time data. Full schema validation (zod)
 * lives in `@typeframe/core` and runs in Node at export/CI time — the browser
 * bundle stays tiny by only accepting already-validated timelines here.
 */
function isTimelineLike(raw: unknown): raw is TerminalTimeline {
  if (typeof raw !== 'object' || raw === null) return false
  const t = raw as Record<string, unknown>
  const meta = t.meta
  return t.version === '1.0' && typeof meta === 'object' && meta !== null && Array.isArray(t.events)
}

export class TerminalPlayer extends HTMLElementBase {
  #timeline: TerminalTimeline | null = null
  #events: ReturnType<typeof materialize> = []
  #state: ScreenState | null = null
  #screen: HTMLElement | null = null
  #toggleBtn: HTMLButtonElement | null = null
  #timer: ReturnType<typeof setTimeout> | null = null
  #playing = false
  #index = 0

  connectedCallback(): void {
    if (this.shadowRoot) return
    const shadow = this.attachShadow({ mode: 'open' })
    shadow.innerHTML = shell()
    this.#screen = shadow.querySelector('.tfp-screen')
    this.#toggleBtn = shadow.querySelector('.tfp-toggle')
    shadow.querySelector('.tfp-toggle')?.addEventListener('click', () => this.toggle())
    shadow.querySelector('.tfp-restart')?.addEventListener('click', () => this.restart())
    shadow.querySelector('.tfp-copy')?.addEventListener('click', () => void this.copy())
    const json = this.querySelector('script[type="application/json"]')?.textContent
    if (json) this.setTimeline(JSON.parse(json))
  }

  disconnectedCallback(): void {
    this.#stop()
  }

  set timeline(raw: unknown) {
    this.setTimeline(raw)
  }

  get timeline(): TerminalTimeline | null {
    return this.#timeline
  }

  setTimeline(raw: unknown): void {
    if (!isTimelineLike(raw)) {
      this.dispatchEvent(
        new CustomEvent('tfp-error', {
          detail: [{ message: 'expected a TypeFrame timeline v1.0' }],
        }),
      )
      return
    }
    this.#timeline = raw
    this.#events = materialize(raw)
    this.#index = 0
    this.#state = new ScreenState(raw.meta.dimensions.width, raw.meta.dimensions.height)
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      // Accessibility: render the static final frame, paused.
      for (const ev of this.#events) this.#state.apply(ev)
      this.#index = this.#events.length
    }
    this.#render()
  }

  play(): void {
    if (this.#playing) return
    if (this.#index >= this.#events.length) this.restart(true)
    this.#playing = true
    this.#updateToggle()
    this.#step()
  }

  pause(): void {
    this.#stop()
    this.#updateToggle()
  }

  toggle(): void {
    if (this.#playing) this.pause()
    else this.play()
  }

  restart(keepPlaying = false): void {
    this.#stop()
    if (this.#timeline) {
      this.#state = new ScreenState(
        this.#timeline.meta.dimensions.width,
        this.#timeline.meta.dimensions.height,
      )
      this.#index = 0
      this.#render()
    }
    if (keepPlaying) {
      this.#playing = true
      this.#updateToggle()
      this.#step()
    }
  }

  async copy(): Promise<void> {
    const text = this.#state?.text() ?? ''
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard permission denied/unavailable: hidden-textarea fallback.
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      } catch {
        this.dispatchEvent(new CustomEvent('tfp-copy-failed', { detail: { text } }))
      }
    }
    this.dispatchEvent(new CustomEvent('tfp-copy', { detail: { text } }))
  }

  #step(): void {
    const ev = this.#events[this.#index]
    if (!ev || !this.#state) {
      this.#playing = false
      this.#updateToggle()
      return
    }
    this.#index += 1
    const delay =
      ev.type === 'wait'
        ? ev.duration
        : ev.type === 'type'
          ? (ev.delay ?? 60)
          : ev.type === 'output'
            ? (ev.delay ?? 30)
            : 0
    this.#state.apply(ev, delay, { stderrColor: '#ff5252' })
    this.#render()
    this.#timer = setTimeout(() => this.#step(), delay)
  }

  #stop(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer)
      this.#timer = null
    }
    this.#playing = false
  }

  #updateToggle(): void {
    if (this.#toggleBtn) this.#toggleBtn.textContent = this.#playing ? '⏸' : '▶'
  }

  #render(): void {
    if (!this.#state || !this.#screen) return
    const rows = this.#state.grid.map((row) => {
      let html = ''
      let run = ''
      let runStyle: string | null = null
      const flush = () => {
        if (!run) return
        html += runStyle ? `<span style="${runStyle}">${escapeHtml(run)}</span>` : escapeHtml(run)
        run = ''
      }
      for (const c of row) {
        const style = c
          ? [
              c.color ? `color:${c.color}` : '',
              c.bold ? 'font-weight:700' : '',
              c.italic ? 'font-style:italic' : '',
              c.underline ? 'text-decoration:underline' : '',
            ]
              .filter(Boolean)
              .join(';') || null
          : null
        if (style !== runStyle) {
          flush()
          runStyle = style
        }
        run += c?.ch ?? ' '
      }
      flush()
      return `<div class="tfp-row">${html || '&nbsp;'}</div>`
    })
    this.#screen.innerHTML = rows.join('')
  }
}

export function register(): void {
  if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
    customElements.define(TAG, TerminalPlayer)
  }
}
register()

export interface PlayerHTMLOptions {
  /** external module URL (default './terminal-player.js'); ignored when `js` is set */
  src?: string
  /** inline JS bundle to produce a single self-contained file (SPEC §5) */
  js?: string
}

/** Standalone HTML page embedding the timeline into a <terminal-player>. */
export function playerHTML(timeline: TerminalTimeline, opts: PlayerHTMLOptions = {}): string {
  const json = JSON.stringify(timeline).replace(/</g, '\\u003c')
  const script = opts.js
    ? `<script type="module">${opts.js.replace(/<\/script>/gi, '<\\/script>')}</script>`
    : `<script type="module" src="${opts.src ?? './terminal-player.js'}"></script>`
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<title>TypeFrame terminal-player</title>` +
    script +
    `</head><body><terminal-player>` +
    `<script type="application/json">${json}</script>` +
    `</terminal-player></body></html>`
  )
}
