'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSettings } from './ThemeProvider'
import { useEffect, useState } from 'react'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

export function Navigation() {
  const router = useRouter()
  const { theme, setTheme, muteAudio, setMuteAudio } = useSettings()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [use24h, setUse24h] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    setCurrentTime(new Date())
    fetch('/api/auth/me').then(res => res.json()).then(data => setUser(data.user))
    
    // Check local storage for time preference
    const pref = localStorage.getItem('timeFormat')
    if (pref) setUse24h(pref === '24')

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    
    // Click outside listener
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // If the menu is open and we click something that is NOT the toggle button 
      // and NOT inside the menu container, close it.
      if (menuOpen && !target.closest('.nav-menu-container')) {
        setMenuOpen(false)
      }
    }
    
    // Use click instead of mousedown to ensure it doesn't fire before the toggle
    document.addEventListener('click', handleClickOutside)
    return () => {
      clearInterval(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setMenuOpen(false)
    router.push('/login')
    router.refresh()
  }

  const toggleTimeFormat = () => {
    const newVal = !use24h
    setUse24h(newVal)
    localStorage.setItem('timeFormat', newVal ? '24' : '12')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: !use24h 
    })
  }

  return (
    <nav className="glass-panel" suppressHydrationWarning style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 2rem', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="MediTracker Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span>MediTracker</span>
          </Link>
        </div>
        
        <div 
          onClick={toggleTimeFormat}
          style={{ 
            fontSize: '1.1rem', 
            fontWeight: 500, 
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            padding: '0.4rem 0.8rem',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            userSelect: 'none'
          }}
          title="Click to toggle 12h/24h"
        >
          {hasMounted && currentTime ? formatTime(currentTime) : '--:--'}
        </div>
      </div>
      
      <div className="nav-menu-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user && <WorkspaceSwitcher />}
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
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            background: 'var(--bg-primary)', // Much more opaque than glass-bg
            border: '1px solid var(--accent-primary)',
            padding: '1.25rem'
          }}>
             <div style={{ fontSize: '0.9rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Hi, {user.name || user.email}</span>
                    {user.role === 'ADMIN' && (
                      <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '0.15rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>ADMIN</span>
                    )}
                  </div>
                ) : 'Guest (Read-Only)'}
             </div>

            {user?.role === 'SUPERADMIN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🛡️ Platform Admin</span>
                <Link href="/superadmin" onClick={() => setMenuOpen(false)} style={{ color: 'var(--danger)', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0', fontWeight: 600 }}>Superadmin Dashboard</Link>
              </div>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 Schedule</span>
                  <Link href="/calendar" onClick={() => setMenuOpen(false)} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0', fontWeight: 600 }}>Medication Timeline</Link>
                  <div 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('reopenUndoToast'))
                      setMenuOpen(false)
                    }}
                    style={{ 
                      color: 'var(--text-primary)', // High contrast 
                      cursor: 'pointer', 
                      fontSize: '0.9rem', 
                      padding: '0.4rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 500
                    }}
                    title="Re-open undo notification"
                  >
                    <span style={{ fontSize: '1.1rem' }}>↩️</span>
                    <span>Undo Menu</span>
                  </div>
                  <Link href="/logs" onClick={() => setMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0' }}>Administration Logs</Link>
                  {user && (() => {
                    const now = new Date()
                    const tzOffset = now.getTimezoneOffset() * 60000
                    const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
                    return (
                      <Link 
                        href={`/log?administeredAt=${localISO}`} 
                        onClick={() => setMenuOpen(false)}
                        style={{ color: 'var(--success)', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0', fontWeight: 600 }}
                      >
                        ➕ Log Past Medication
                      </Link>
                    )
                  })()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👥 People</span>
                  <Link href="/patients" onClick={() => setMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0' }}>Patients</Link>
                  <Link href="/invitations" onClick={() => setMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0' }}>Caregivers</Link>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💊 Medication Inventory</span>
                  <Link href="/medications" onClick={() => setMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0' }}>Medications</Link>
                  <Link href="/add" onClick={() => setMenuOpen(false)} style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.95rem', padding: '0.25rem 0' }}>+ Add New Med</Link>
                </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚙️ Configuration</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Theme</label>
                <select 
                  className="input-field" 
                  style={{ padding: '0.4rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }} 
                  value={theme} 
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="dark" style={{ background: '#1a1a1a', color: '#ffffff' }}>Dark Theme</option>
                  <option value="light" style={{ background: '#ffffff', color: '#1a1a1a' }}>Light Theme</option>
                </select>
              </div>
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
