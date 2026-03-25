'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSettings } from './ThemeProvider'
import { useEffect, useState } from 'react'

export function Navigation() {
  const router = useRouter()
  const { theme, setTheme, muteAudio, setMuteAudio } = useSettings()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => setUser(data.user))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setMenuOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="glass-panel" suppressHydrationWarning style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 2rem', position: 'relative' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>💊 MediTracker</Link>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link href="/log" className="btn" style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Log Past Med</Link>
        
        {user?.role === 'ADMIN' && (
          <Link href="/add" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>+ Add Med</Link>
        )}
        
        <button 
          onClick={() => setMenuOpen(!menuOpen)} 
          className="btn" 
          style={{ padding: '0.4rem 0.6rem', fontSize: '1.2rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ☰
        </button>

        {menuOpen && (
          <div className="glass-panel" style={{ 
            position: 'absolute', top: '100%', right: '2rem', zIndex: 100, 
            display: 'flex', flexDirection: 'column', gap: '1rem', 
            marginTop: '0.5rem', minWidth: '220px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '0.9rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
               {user ? (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span>Hi, {user.name || user.username}</span>
                   {user.role === 'ADMIN' && (
                     <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '0.15rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>ADMIN</span>
                   )}
                 </div>
               ) : 'Guest (Read-Only)'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Theme</label>
              <select className="input-field" style={{ padding: '0.4rem' }} value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
              </select>
            </div>
            
            <button onClick={() => setMuteAudio(!muteAudio)} className="btn" style={{ padding: '0.5rem', background: 'var(--bg-secondary)', color: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {muteAudio ? '🔇 Sounds Muted' : '🔊 Sounds Active'}
            </button>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              {user ? (
                 <button onClick={handleLogout} className="btn" style={{ width: '100%', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>Logout</button>
              ) : (
                 <Link href="/login" className="btn btn-primary" onClick={() => setMenuOpen(false)} style={{ display: 'block', width: '100%', padding: '0.5rem', textAlign: 'center' }}>Login</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
