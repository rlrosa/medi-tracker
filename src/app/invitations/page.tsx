'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'

export default function InvitationsPage() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('CAREGIVER')

  const fetchInvitations = async () => {
    const res = await fetch('/api/invitations')
    if (res.ok) {
      const data = await res.json()
      setInvitations(data.invitations || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/')
        } else {
          fetchInvitations()
        }
      })
  }, [router])

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, role: newRole })
    })
    if (res.ok) {
      setNewEmail('')
      setShowAdd(false)
      fetchInvitations()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to create invitation')
    }
  }

  return (
    <div className="container">
      <Navigation />
      
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>Management: Caregivers</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Generate access links for caregivers. <span style={{ color: 'var(--accent-secondary)' }}>(Email delivery disabled)</span></p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Generate Link</button>
        </div>

        {showAdd && (
          <div className="glass-panel" style={{ marginBottom: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-secondary)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Generate Caregiver Link</h3>
            <form onSubmit={handleCreateInvitation} className="flex-col" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>Email Address</label>
                <input required type="email" className="input-field" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="caregiver@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>Role</label>
                <select className="input-field" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="CAREGIVER">Caregiver</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Link</button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Note: In this demo, the invitation will appear in the list below with a "Copy Link" option.
              </p>
            </form>
          </div>
        )}

        {loading ? (
          <p>Loading invitations...</p>
        ) : invitations.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No active invitations or caregivers.</p>
        ) : (
          <div className="flex-col" style={{ gap: '1rem' }}>
            {invitations.map(inv => (
              <div key={inv.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    {inv.name ? `${inv.name} (${inv.email})` : inv.email}
                    {inv.isUser && <span style={{ marginLeft: '0.75rem', fontSize: '0.7rem', backgroundColor: 'var(--success)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', verticalAlign: 'middle' }}>ACTIVE</span>}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Role: {inv.role}</span>
                    {inv.isUser ? (
                      <span style={{ color: 'var(--success)' }}>Joined {new Date(inv.acceptedAt).toLocaleDateString()}</span>
                    ) : (
                      inv.acceptedAt ? (
                        <span style={{ color: 'var(--success)' }}>✅ Accepted {new Date(inv.acceptedAt).toLocaleDateString()}</span>
                      ) : (
                        <span style={{ color: 'var(--accent-secondary)' }}>⏳ Pending (Expires {new Date(inv.expiresAt).toLocaleDateString()})</span>
                      )
                    )}
                  </div>
                </div>
                {inv.isUser || inv.acceptedAt ? (
                  <button 
                    onClick={() => {
                      // Mock reset link generation
                      const url = `${window.location.origin}/reset-password?token=${Math.random().toString(36).substring(7)}&email=${inv.email}`
                      navigator.clipboard.writeText(url)
                      alert(`Password reset link for ${inv.email} copied to clipboard!`)
                    }} 
                    className="btn" 
                    style={{ fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}
                  >
                    🔑 Reset Password
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/accept?token=${inv.token}`
                      navigator.clipboard.writeText(url)
                      alert('Invitation link copied to clipboard!')
                    }} 
                    className="btn" 
                    style={{ fontSize: '0.85rem' }}
                  >
                    🔗 Resend Link
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Link href="/medications" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>← Back to Management</Link>
      </div>
    </div>
  )
}
