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

  // Intercept all fetch requests on the client to safely inject the ngrok bypass header
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (resource, config = {}) => {
        config.headers = {
          ...config.headers,
          'ngrok-skip-browser-warning': 'any'
        };
        return originalFetch(resource, config);
      };
      
      // Better Error Reporting for Next.js HMR WebSocket Failures over Ngrok
      const originalError = console.error;
      console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('webpack-hmr')) {
          console.warn('💡 [DEV HINT] Next.js Hot Module Replacement (HMR) WebSocket was blocked. Since you are using Ngrok, you must explicitly whitelist your temporary Ngrok URL in `next.config.ts` under `allowedDevOrigins` to enable live reloading.');
          return; // Suppress the ugly raw error stack trace to avoid clutter
        }
        originalError(...args);
      };
    }
  }, []);

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
