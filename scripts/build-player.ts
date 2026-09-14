/** Build the single-file <terminal-player> bundle to dist/terminal-player.js. */
import { mkdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const build = await Bun.build({
  entrypoints: [new URL('../packages/player/src/index.ts', import.meta.url).pathname],
  minify: true,
  target: 'browser',
})
if (!build.success) {
  console.error('✖ build failed:', build.logs)
  process.exit(1)
}
const js = await build.outputs[0].text()
await mkdir(new URL('../dist/', import.meta.url), { recursive: true })
const out = new URL('../dist/terminal-player.js', import.meta.url).pathname
await writeFile(out, js)
const gz = gzipSync(Buffer.from(js, 'utf8')).length
console.log(`✔ wrote ${out} (${js.length} B raw, ${gz} B gzipped)`)
