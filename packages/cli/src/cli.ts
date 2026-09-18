import packageJson from '../package.json' with { type: 'json' }
import { create } from './commands/create.js'
import { exportCmd } from './commands/export.js'
import { validateCmd } from './commands/validate.js'
import { recordCmd } from './record/pty.js'

export const VERSION = packageJson.version

export const HELP = `typeframe — Type. Frame. Ship.

Usage:
  typeframe --help                              show this help
  typeframe --version                           show the installed version
  typeframe create [prompt]                     draft a timeline and open the Ink studio
  typeframe create --template <name> [opts]    build from a template
  typeframe create --list-templates             list available templates
  typeframe export <file> [--format svg|player|json] [-o out]
  typeframe validate <file>                     validate a timeline JSON file
  typeframe record -- <cmd>                     record a command via pty (Unix-first)

Template options: --theme <name> --window-style <name> --physics <name> --seed <n>
Options are documented in docs/SPEC-v1.1.md.
`

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv
  switch (cmd) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(HELP)
      return 0
    case 'version':
    case '--version':
    case '-v':
      process.stdout.write(`${VERSION}\n`)
      return 0
    case 'create':
      return create(rest)
    case 'export':
      return exportCmd(rest)
    case 'validate':
      return validateCmd(rest)
    case 'record':
      return recordCmd(rest)
    default:
      process.stderr.write(`✖ unknown command "${cmd}"\n\n`)
      process.stderr.write(HELP)
      return 1
  }
}

const meta = import.meta as unknown as { main?: boolean }
if (meta.main) {
  process.exitCode = await main(process.argv.slice(2))
}
