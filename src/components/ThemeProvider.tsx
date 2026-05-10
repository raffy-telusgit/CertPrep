import type { ReactNode } from 'react'
import { ThemeContext, useThemeProvider } from '@/lib/theme'

interface ThemeProviderProps {
  children: ReactNode
}

function ThemeProvider({ children }: ThemeProviderProps) {
  const themeValue = useThemeProvider()
  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
