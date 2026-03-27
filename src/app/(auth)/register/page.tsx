'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState('SOLO')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, accountName, accountType })
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <main className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', textAlign: 'center' }}>
        <img src="/logo.png" alt="MediTracker" style={{ width: '80px', height: '80px', marginBottom: '1rem', objectFit: 'contain' }} />
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>MediTracker</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Create your account</p>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleRegister} className="flex-col" style={{ gap: '1rem', display: 'flex' }}>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Account Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Smith Family"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Mode</label>
              <select 
                className="input-field"
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="SOLO">Solo (Self-only)</option>
                <option value="COORDINATOR">Coordinator (Multiple patients/caregivers)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Your Name (Admin)</label>
            <input 
              type="text" 
              className="input-field" 
              value={name}
              onChange={e => setName(e.target.value)}
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Login here</Link>
        </div>
      </div>
    </main>
  )
}
