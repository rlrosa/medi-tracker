'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    
    // Mock password reset API call
    // In a real app, this would verify the token and update the user's password hash
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
    }, 1500)
  }

  if (success) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Password Reset Successful!</h2>
        <p style={{ marginBottom: '2rem' }}>Your password has been updated. You can now log in with your new password.</p>
        <button onClick={() => router.push('/login')} className="btn btn-primary">Go to Login</button>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '450px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Reset Password</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Setting new password for: <strong>{email || 'your account'}</strong>
      </p>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '0.9rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="flex-col" style={{ gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>New Password</label>
          <input 
            required 
            type="password" 
            className="input-field" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Confirm New Password</label>
          <input 
            required 
            type="password" 
            className="input-field" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            placeholder="••••••••"
          />
        </div>
        <button disabled={loading} type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="container">
      <Navigation />
      <Suspense fallback={<div className="container" style={{ textAlign: 'center' }}>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
