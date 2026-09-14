/**
 * CI size-budget gate (SPEC v1.1 §4/§5):
 *  - player shell  <= 5 KB gzipped
 *  - example SVG   <= 50 KB
 * Exits non-zero when a budget is breached.
 */
import { gzipSync } from 'node:zlib'
import hero from '../examples/hero.json'
import { parseTimeline } from '../packages/core/src/index.js'
import { renderSVG } from '../packages/svg/src/render.js'

const PLAYER_GZ_BUDGET = 5 * 1024
const SVG_BUDGET = 50 * 1024

const build = await Bun.build({
  entrypoints: [new URL('../packages/player/src/index.ts', import.meta.url).pathname],
  minify: true,
  target: 'browser',
})
if (!build.success) {
  console.error('✖ player bundle failed:', build.logs)
  process.exit(1)
}
const js = await build.outputs[0].text()
const gz = gzipSync(Buffer.from(js, 'utf8')).length
console.log(`player shell: ${js.length} B raw, ${gz} B gzipped (budget ${PLAYER_GZ_BUDGET} B)`)

const svg = renderSVG(parseTimeline(hero))
const svgBytes = Buffer.byteLength(svg)
console.log(`example svg:  ${svgBytes} B (budget ${SVG_BUDGET} B)`)

const ok = gz <= PLAYER_GZ_BUDGET && svgBytes <= SVG_BUDGET
console.log(ok ? '✔ size budgets satisfied' : '✖ size budget exceeded')
process.exit(ok ? 0 : 1)
