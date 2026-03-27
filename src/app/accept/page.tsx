'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function AcceptInvitationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, name })
    })

    if (res.ok) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to accept invitation')
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <main className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)' }}>Invalid Link</h2>
          <p>No invitation token provided. Please check your link.</p>
          <Link href="/login" className="btn" style={{ marginTop: '1rem', display: 'inline-block' }}>Go to Login</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', textAlign: 'center' }}>
        <img src="/logo.png" alt="MediTracker" style={{ width: '80px', height: '80px', marginBottom: '1rem', objectFit: 'contain' }} />
        
        {success ? (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Welcome to the Team!</h2>
            <p>Your account has been created. Redirecting you to the dashboard...</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Join MediTracker</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Complete your profile to start caring.</p>
            
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
            
            <form onSubmit={handleSubmit} className="flex-col" style={{ gap: '1rem', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Your Full Name</label>
                <input required type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Set Password</label>
                <input required type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Confirm Password</label>
                <input required type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {loading ? 'Joining...' : 'Create Account & Join'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>}>
      <AcceptInvitationForm />
    </Suspense>
  )
}
