'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <main className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '2.5rem',
        background: 'var(--bg-secondary)', // Solid secondary color for better contrast
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="MediTracker" style={{ width: '64px', height: '64px', marginBottom: '1.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Enter your credentials to manage medications</p>
        </div>
        
        {error && (
          <div style={{ 
            background: 'var(--danger-glow)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '1rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem', 
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="flex-col" style={{ gap: '1.5rem' }}>
          <div className="flex-col" style={{ gap: '0.5rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email or Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Username (e.g. rr)"
              value={email}
              autoFocus
              onChange={e => setEmail(e.target.value)}
              style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', fontSize: '1rem' }}
              required 
            />
          </div>
          <div className="flex-col" style={{ gap: '0.5rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: '0.85rem 1rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', fontSize: '1rem' }}
              required 
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              marginTop: '1rem', 
              width: '100%', 
              padding: '1rem', 
              fontSize: '1rem', 
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)'
            }} 
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
        </div>
      </div>
    </main>
  )
}
