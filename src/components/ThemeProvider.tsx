'use client'
import { useEffect, useState, createContext, useContext } from 'react'

type ThemeContextType = {
  theme: string
  setTheme: (theme: string) => void
  muteAudio: boolean
  setMuteAudio: (mute: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState('dark')
  const [muteAudio, setMuteAudioState] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    const savedMute = localStorage.getItem('muteAudio') === 'true'
    setTheme(savedTheme)
    setMuteAudioState(savedMute)
  }, [])

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  const setMuteAudio = (mute: boolean) => {
    setMuteAudioState(mute)
    localStorage.setItem('muteAudio', String(mute))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, muteAudio, setMuteAudio }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useSettings must be used within ThemeProvider')
  return context
}
