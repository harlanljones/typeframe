# Product Requirements Document (PRD): TermiMotion

**Document Version:** 1.0

**Status:** Ready for Review

**Target Delivery:** Q4 2026

---

## 1. Executive Summary & Problem Statement

Developers, technical writers, and product teams struggle to showcase command-line tools effectively on landing pages and documentation. Current solutions (GIFs, MP4 videos, heavy asciinema wrappers) suffer from:

* Large asset sizes and poor performance/LCP scores.
* Blurry scaling on high-DPI displays.
* Inability to copy/paste text from the terminal preview.
* Incompatibility or complex setup across heterogeneous web frameworks (React, Vue, Svelte, Astro, plain HTML).

**TermiMotion** is an open-source CLI/TUI tool that converts raw commands or natural language descriptions into terminal animation assets. It outputs framework-agnostic formats (pure animated SVG/CSS and zero-dependency Web Components) that drop seamlessly into any web ecosystem.

---

## 2. Target Personas

* **Developer Advocates / DevRel:** Need quick, branded animations for changelogs, docs, and READMEs.
* **Frontend Developers:** Need performant, responsive terminal hero sections that don't bloat the bundle or conflict with their framework.
* **Open-Source Maintainers:** Need an effortless way to create dynamic CLI previews without recording their actual desktop screen.

---

## 3. Product Goals & Success Metrics

**Goals:**

* Enable zero-setup terminal animation generation in `< 2 minutes` from terminal to web page.
* Support 100% of modern web frameworks via native web standards.
* Keep static outputs under **50 KB** and interactive web component runtimes under **5 KB gzipped**.

**Success Metrics:**

* Time-to-Export: Average user completes input-to-export cycle in under 90 seconds.
* Integration friction: 0 reported framework-compatibility bugs across React, Vue, Svelte, Angular, and static HTML.
* Performance: PageSpeed / Core Web Vitals score impact of `< 5ms` execution time for the Web Component.

---

## 4. Feature Requirements & User Stories

### 4.1. Input & Script Generation

* **Direct Scripting Mode:** Accept inline arguments or an interactive prompt where users specify shell commands, deliberate typing delays, and expected outputs.
* **Natural Language Parsing (LLM Mode):** Accept high-level prompts (e.g., `"Show a Docker build that fails on step 3 then retries and succeeds"`) and convert them into a structured execution timeline JSON.
* **Real Terminal Recording (Optional Passthrough):** Allow capturing raw commands via sub-shell recording (`pty`) to grab real stdout/stderr and timestamps.

### 4.2. TUI Studio & Customization

An interactive TUI built with **Charm Bubbletea** (or **Ink**) providing:

* **Live Scrubbing & Playback:** Play, pause, restart, and scrub animation frames directly in the terminal preview.
* **Typing Physics:** Switch between *Human Typist* (jitter, backspaces, pauses), *CI/CD Burst* (fast stream), and *Instant Loader*.
* **Window Styling:** Select frame designs (macOS dots, Windows 11 flat, minimal border, no chrome).
* **Color Themes:** Built-in presets (Catppuccin, Dracula, Tokyo Night, Nord, Monokai, High Contrast) plus custom hex input.

### 4.3. Universal Export Targets

* **Export Option A — Pure Animated SVG:**
  * Zero runtime JavaScript.
  * Self-contained CSS `@keyframes` inside `<svg><style>`.
  * Fully responsive and compatible with `<img>`, Markdown, and static site generators.

* **Export Option B — Autonomous Web Component (`<terminal-player>`):**
  * Single self-contained `.js` bundle with Shadow DOM encapsulation.
  * Native controls: play/pause, restart, copy-to-clipboard button.
  * Embedded timeline data so no secondary network request is required.

* **Export Option C — Raw Timeline JSON:**
  * Schema-validated intermediate file for headless CI/CD builds.

---

## 5. Technical Architecture & Data Schema

### 5.1. Timeline Event Schema

The intermediate representation passed between the CLI generator, TUI previewer, and exporter:

```typescript
interface TerminalTimeline {
  version: "1.0";
  meta: {
    theme: string;
    windowStyle: "macos" | "flat" | "minimal";
    dimensions: { width: number; height: number };
  };
  events: Array<
    | { type: "type"; text: string; delay?: number }
    | { type: "wait"; duration: number }
    | { type: "output"; text: string; stream?: "stdout" | "stderr"; color?: string }
    | { type: "clear" }
  >;
}
```

### 5.2. Tech Stack Recommendations

* **CLI/TUI Layer:** TypeScript with **Ink** (React in CLI) to allow 100% component and styling logic reuse with the Web Component generator.
* **Terminal Emulation/ANSI Parser:** `ansi-to-html` / `xterm-headless` for accurate ANSI color rendering.
* **Bundler:** `esbuild` for instant single-file Web Component distribution.

---

## 6. User Workflow

```
1. Run CLI command:
   $ termimotion create "deploying to production with flyctl"

2. CLI generates timeline draft and launches TUI Studio.

3. User configures:
   - Theme: [Tokyo Night]
   - Speed: [Normal (Typing Jitter)]
   - Chrome: [macOS]

4. User previews animation inside the terminal.

5. User selects Export:
   [1] Standalone Animated SVG (hero.svg)
   [2] Single-File Web Component (terminal-player.js)
   [3] Copy HTML / React snippet to clipboard

6. File written to `./public/` or output directory.
```

---

## 7. Out of Scope (v1)

* Interactive user input during playback (playback is non-interactive demo only).
* In-browser live recording studio (remains CLI/TUI-first).
* Direct MP4/GIF rendering (prioritizing vector and web-native standard formats).

---

## 8. Release Milestones

* **M1: Core Engine (Weeks 1–2):** Timeline schema, JSON parser, and SVG/CSS generator.
* **M2: Web Component Bundle (Weeks 3–4):** Standalone Custom Element with embedded shadow styles and copy button.
* **M3: TUI Development (Weeks 5–6):** Interactive terminal viewer with theme selectors and scrubber.
* **M4: LLM Translation & Polishing (Weeks 7–8):** Prompt-to-timeline generation, docs site, and npm release.

