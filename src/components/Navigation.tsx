'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSettings } from './ThemeProvider'
import { useEffect, useState } from 'react'

export function Navigation() {
  const router = useRouter()
  const { theme, setTheme, muteAudio, setMuteAudio } = useSettings()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => setUser(data.user))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 2rem' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>💊 MediTracker</Link>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {/* Settings */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select 
            className="input-field" 
            style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
          </select>
          
          <button 
            onClick={() => setMuteAudio(!muteAudio)}
            className="btn" 
            style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'inherit' }}
          >
            {muteAudio ? '🔇 Muted' : '🔊 Sound On'}
          </button>
        </div>

        {/* Auth State */}
        {user ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>Hello, {user.name}</span>
            <Link href="/add" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>+ Add Med</Link>
            <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>Logout</button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Login</Link>
        )}
      </div>
    </nav>
  )
}
