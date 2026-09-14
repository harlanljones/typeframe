import { create } from './commands/create.js'
import { exportCmd } from './commands/export.js'
import { validateCmd } from './commands/validate.js'
import { recordCmd } from './record/pty.js'

const HELP = `typeframe — Type. Frame. Ship.

Usage:
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
    case 'create':
      return create(rest)
    case 'export':
      return exportCmd(rest)
    case 'validate':
      return validateCmd(rest)
    case 'record':
      return recordCmd(rest)
    default:
      process.stderr.write(HELP)
      return cmd === undefined ? 0 : 1
  }
}

const meta = import.meta as unknown as { main?: boolean }
if (meta.main) {
  process.exitCode = await main(process.argv.slice(2))
}
