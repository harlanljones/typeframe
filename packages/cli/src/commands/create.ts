import type { TerminalTimeline } from '@typeframe/core'
import { runStudio } from '../studio/studio.js'
import { buildTemplate, listTemplateNames, type TemplateContext } from '../templates/index.js'

/**
 * Legacy prompt-driven draft (template-based; LLM mode is post-v1).
 * Delegates to the `hero` template so prompt + template paths share one pipeline.
 */
export function buildTimelineFromPrompt(prompt: string): TerminalTimeline {
  return buildTemplate('hero', { prompt })
}

export async function create(args: string[]): Promise<number> {
  const flags = new Set<string>()
  const positional: string[] = []
  let template: string | undefined
  let theme: string | undefined
  let windowStyle: TemplateContext['windowStyle']
  let physics: TemplateContext['physics']
  let seed: number | undefined

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--template') template = args[++i]
    else if (a === '--theme') theme = args[++i]
    else if (a === '--window-style') windowStyle = args[++i] as TemplateContext['windowStyle']
    else if (a === '--physics') physics = args[++i] as TemplateContext['physics']
    else if (a === '--seed') seed = Number.parseInt(args[++i] ?? '', 10)
    else if (a === '--list-templates' || a === '-l') {
      for (const name of listTemplateNames()) {
        process.stdout.write(`${name.padEnd(10)} ${TEMPLATE_DESCRIPTIONS[name] ?? ''}\n`)
      }
      return 0
    } else if (a.startsWith('-')) flags.add(a)
    else positional.push(a)
  }

  const prompt = positional.join(' ') || 'a cozy terminal session'

  let timeline: TerminalTimeline
  if (template) {
    if (!listTemplateNames().includes(template)) {
      process.stderr.write(
        `✖ unknown template "${template}" (have: ${listTemplateNames().join(', ')})\n`,
      )
      return 1
    }
    timeline = buildTemplate(template, { prompt, theme, windowStyle, physics, seed })
  } else {
    timeline = buildTimelineFromPrompt(prompt)
  }

  if (process.stdout.isTTY && !flags.has('--no-tui')) {
    await runStudio(timeline)
    return 0
  }
  process.stdout.write(`${JSON.stringify(timeline, null, 2)}\n`)
  return 0
}

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  hero: 'branded hero: draft a timeline from a prompt, then export',
  install: 'install flow: npm i -g typeframe then a ready line',
  demo: 'docker build that fails on a step, clears, then succeeds',
  welcome: 'welcome banner with the typeframe CLI usage hint',
}
