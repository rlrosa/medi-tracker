'use client'
import { useState, useEffect } from 'react'
import { Navigation } from '@/components/Navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [filters, setFilters] = useState({ name: '', date: '', user: '' })

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => setCurrentUser(data.user))
  }, [])

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      const query = new URLSearchParams()
      if (filters.name) query.append('name', filters.name)
      if (filters.date) query.append('date', filters.date)
      if (filters.user) query.append('user', filters.user)
      
      const res = await fetch(`/api/logs?${query.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
      setLoading(false)
    }
    
    // debounce fetching
    const timeout = setTimeout(fetchLogs, 400)
    return () => clearTimeout(timeout)
  }, [filters])

  const handleDelete = async (id: string, e: any) => {
    e.preventDefault()
    if (!confirm('Permanently delete this log?')) return
    const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLogs(logs.filter(l => l.id !== id))
    }
  }

  return (
    <main className="container">
      <Navigation />
      
      <div className="glass-panel">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>All Administrations</h2>
        
        {/* Filters */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Medication Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search by med..." 
              value={filters.name} 
              onChange={e => setFilters({...filters, name: e.target.value})} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Date</label>
            <input 
              type="date" 
              className="input-field" 
              value={filters.date} 
              onChange={e => setFilters({...filters, date: e.target.value})} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>User ID</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Filter by exact user id..." 
              value={filters.user} 
              onChange={e => setFilters({...filters, user: e.target.value})} 
            />
          </div>
        </div>
        
        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading logs...</div>
        ) : (
          <div className="flex-col" style={{ gap: '1rem' }}>
            {logs.length === 0 ? <div style={{ color: 'var(--text-secondary)' }}>No logs found matching filters.</div> : null}
            {logs.map(log => {
              const canEdit = currentUser && (currentUser.role === 'ADMIN' || currentUser.id === log.administeredByUserId)
              const medIcon = log.schedule?.icon || log.medication.schedules?.[0]?.icon || 'Pill'
              const medColor = log.schedule?.color || log.medication.schedules?.[0]?.color || 'var(--accent-primary)'
              const LucideIcon = (Icons as any)[medIcon] || Icons.Pill
              
              return (
                <Link key={log.id} href={canEdit ? `/log/${log.id}/edit` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="glass-panel" style={{ padding: '1rem', transition: 'background 0.2s', cursor: canEdit ? 'pointer' : 'default', borderColor: 'var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: medColor, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                      }}>
                        <LucideIcon size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{log.medication.name}</div>
                          {log.medication.alias && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              ({log.medication.alias})
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.administeredAt).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          By: {log.administeredByUser?.name || log.administeredByUser?.username || 'Unknown'} 
                          {log.notes && <span style={{ marginLeft: '1rem', fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>"{log.notes}"</span>}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span className="btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', backgroundColor: 'var(--bg-secondary)' }}>Edit</span>
                        <button onClick={(e) => handleDelete(log.id, e)} className="btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', background: 'transparent', color: 'var(--danger)' }}>Del</button>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
