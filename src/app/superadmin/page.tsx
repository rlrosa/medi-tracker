'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/users')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/')
        } else {
          throw new Error('Failed to fetch users')
        }
      } else {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isApproved: !currentStatus })
      })

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, isApproved: !currentStatus } : u))
      } else {
        alert('Failed to update user status')
      }
    } catch (err) {
      alert('Error updating user')
    }
  }

  return (
    <div className="container">
      <Navigation />
      <main className="glass-panel" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Superadmin Dashboard</h1>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div>Loading users...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem 0' }}>Name / Email</th>
                  <th style={{ padding: '1rem 0' }}>Primary Account</th>
                  <th style={{ padding: '1rem 0' }}>Role</th>
                  <th style={{ padding: '1rem 0' }}>Registered</th>
                  <th style={{ padding: '1rem 0' }}>Email Status</th>
                  <th style={{ padding: '1rem 0' }}>Approval Status</th>
                  <th style={{ padding: '1rem 0', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)', fontSize: '0.95rem' }}>
                    <td style={{ padding: '1rem 0' }}>
                      <div style={{ fontWeight: 600 }}>{user.name || 'Unnamed'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.email || user.username}</div>
                    </td>
                    <td style={{ padding: '1rem 0' }}>{user.account?.name || 'None'}</td>
                    <td style={{ padding: '1rem 0' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: 'var(--bg-secondary)'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 0' }}>
                      {user.emailVerified ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Verified</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0' }}>
                      {user.isApproved ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Approved</span>
                      ) : (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                      <button
                        onClick={() => toggleApproval(user.id, user.isApproved)}
                        className="btn"
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.85rem',
                          background: user.isApproved ? 'transparent' : 'var(--success)',
                          color: user.isApproved ? 'var(--danger)' : 'white',
                          border: user.isApproved ? '1px solid var(--danger)' : 'none'
                        }}
                      >
                        {user.isApproved ? 'Revoke Access' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
