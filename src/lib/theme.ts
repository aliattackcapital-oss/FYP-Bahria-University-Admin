const THEME_KEY = 'bup_theme'

export type Theme = 'light' | 'dark'

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
}

export function toggleTheme(): Theme {
  const next = getStoredTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
