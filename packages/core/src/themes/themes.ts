export interface Theme {
  name: string
  bg: string
  fg: string
  cursor: string
  palette: {
    red: string
    green: string
    yellow: string
    blue: string
    magenta: string
    cyan: string
  }
}

const PRESETS: Record<string, Theme> = {
  'catppuccin-mocha': {
    name: 'catppuccin-mocha',
    bg: '#1e1e2e',
    fg: '#cdd6f4',
    cursor: '#f5e0dc',
    palette: {
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#cba6f7',
      cyan: '#94e2d5',
    },
  },
  dracula: {
    name: 'dracula',
    bg: '#282a36',
    fg: '#f8f8f2',
    cursor: '#f8f8f0',
    palette: {
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
    },
  },
  'tokyo-night': {
    name: 'tokyo-night',
    bg: '#1a1b26',
    fg: '#a9b1d6',
    cursor: '#c0caf5',
    palette: {
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      magenta: '#bb9af7',
      cyan: '#7dcfff',
    },
  },
  nord: {
    name: 'nord',
    bg: '#2e3440',
    fg: '#d8dee9',
    cursor: '#d8dee9',
    palette: {
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
    },
  },
  monokai: {
    name: 'monokai',
    bg: '#272822',
    fg: '#f8f8f2',
    cursor: '#f8f8f0',
    palette: {
      red: '#f92672',
      green: '#a6e22e',
      yellow: '#e6db74',
      blue: '#66d9ef',
      magenta: '#fd971f',
      cyan: '#a1efe4',
    },
  },
  'high-contrast': {
    name: 'high-contrast',
    bg: '#000000',
    fg: '#ffffff',
    cursor: '#ffffff',
    palette: {
      red: '#ff5252',
      green: '#4caf50',
      yellow: '#ffd740',
      blue: '#448aff',
      magenta: '#e040fb',
      cyan: '#18ffff',
    },
  },
}

export const DEFAULT_THEME = 'tokyo-night'

export function listThemes(): string[] {
  return Object.keys(PRESETS)
}

export function getTheme(name: string): Theme | undefined {
  return PRESETS[name]
}

export function resolveTheme(name?: string): Theme {
  if (name && PRESETS[name]) return PRESETS[name] as Theme
  return PRESETS[DEFAULT_THEME] as Theme
}

/** Build a custom theme from raw hex values ("custom hex input" in PRD §4.2). */
export function createCustomTheme(
  name: string,
  colors: { bg: string; fg: string; cursor?: string; palette?: Partial<Theme['palette']> },
): Theme {
  const base = resolveTheme()
  return {
    name,
    bg: colors.bg,
    fg: colors.fg,
    cursor: colors.cursor ?? colors.fg,
    palette: { ...base.palette, ...colors.palette },
  }
}
