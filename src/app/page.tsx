'use client'
import { useEffect, useState, useRef, use } from 'react'
import { Navigation } from '@/components/Navigation'
import { useSettings } from '@/components/ThemeProvider'
import Link from 'next/link'

const beepSoundUrl = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'

export default function Dashboard() {
  const { muteAudio } = useSettings()
  const [user, setUser] = useState<any>(null)
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  
  const lastNotifiedAt = useRef<Record<string, number>>({})
  const snoozedUntil = useRef<Record<string, number>>({})
  // We need state to trigger re-renders for snoozed buttons
  const [snoozeTrigger, setSnoozeTrigger] = useState(0)

  const fetchData = async () => {
    try {
      const [meRes, upcomingRes, recentRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/medications/upcoming?hours=24'),
        fetch('/api/logs/recent')
      ])
      
      const meData = await meRes.json()
      setUser(meData.user)
      
      if (upcomingRes.ok) {
        const uData = await upcomingRes.json()
        setUpcoming(uData.upcoming || [])
        checkNotifications(uData.upcoming || [])
      }
      
      if (recentRes.ok) {
        const rData = await recentRes.json()
        setRecent(rData.logs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission()
    }
    
    return () => clearInterval(interval)
  }, [])

  const checkNotifications = (meds: any[]) => {
    const now = Date.now()
    meds.forEach(med => {
      const dueTime = new Date(med.nextDue).getTime()
      if (med.isOverdue || (dueTime - now < 10 * 60 * 1000)) {
        
        const isSnoozed = snoozedUntil.current[med.id] && snoozedUntil.current[med.id] > now
        const hasNotifiedRecently = lastNotifiedAt.current[med.id] && (now - lastNotifiedAt.current[med.id] < 5 * 60 * 1000)
        
        if (!isSnoozed && !hasNotifiedRecently) {
          triggerNotification(med)
          lastNotifiedAt.current[med.id] = now
        }
      }
    })
  }

  const triggerNotification = (med: any) => {
    if (!muteAudio) {
      try {
        const audio = new Audio(beepSoundUrl)
        audio.play().catch(e => console.log('Audio play ignored'))
      } catch(e) {}
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Medication Due!', {
        body: `It is time to take ${med.name}`,
        icon: med.imageUrl || undefined
      })
    }
  }

  const handleAdminister = async (medId: string) => {
    if (!user) return alert('Must be logged in')
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId: medId, notes: notes[medId] || '' })
    })
    if (res.ok) {
      setNotes(prev => ({ ...prev, [medId]: '' }))
      fetchData()
    }
  }

  const handleDelete = async (medId: string) => {
    if (!confirm('Delete this medication permanently?')) return
    await fetch(`/api/medications/${medId}`, { method: 'DELETE' })
    fetchData()
  }

  const handleSnooze = (medId: string) => {
    snoozedUntil.current[medId] = Date.now() + 30 * 60 * 1000 // 30 mins
    setSnoozeTrigger(snoozeTrigger + 1)
  }

  return (
    <div className="container">
      <Navigation />
      
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
              Upcoming Medications (24h)
            </h2>
            
            {upcoming.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', opacity: 0.7 }}>
                No medications due in the next 24 hours.
              </div>
            ) : (
              upcoming.map(med => {
                const now = Date.now()
                const dueTime = new Date(med.nextDue).getTime()
                const isDueSoon = med.isOverdue || (dueTime - now < 10 * 60 * 1000)
                const isSnoozed = snoozedUntil.current[med.id] && snoozedUntil.current[med.id] > now
                const marginMs = (med.marginMinutes || 30) * 60 * 1000
                const isWithinMargin = Math.abs(dueTime - now) <= marginMs

                return (
                  <div key={med.instanceId || med.id} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: med.isOverdue ? '4px solid var(--danger)' : '1px solid var(--glass-border)' }}>
                    {med.imageUrl && (
                      <img src={med.imageUrl} alt={med.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{med.name}</h3>
                      {med.alias && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{med.alias}</p>}
                      <p style={{ fontSize: '0.95rem', marginTop: '0.5rem', color: med.isOverdue ? 'var(--danger)' : 'inherit', fontWeight: med.isOverdue ? 'bold' : 'normal' }}>
                        {med.isOverdue ? '⚠️ Overdue since ' : '🕒 Due at '}
                        {new Date(med.nextDue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isSnoozed && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', color: 'var(--accent-secondary)' }}>(Snoozed)</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      {user && isDueSoon && !isSnoozed && (
                        <button onClick={() => handleSnooze(med.id)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                          💤 Snooze 30m
                        </button>
                      )}
                      
                      {user ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end', width: '100%' }}>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Optional notes (e.g. dosage amount)" 
                            value={notes[med.id] || ''}
                            onChange={e => setNotes({...notes, [med.id]: e.target.value})}
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '16px', maxWidth: '200px' }}
                            disabled={!isWithinMargin}
                          />
                          <button 
                            onClick={() => isWithinMargin && handleAdminister(med.id)} 
                            className={`btn ${isWithinMargin ? 'btn-success' : ''}`} 
                            style={{ 
                              padding: '0.75rem 1.5rem', 
                              borderRadius: '24px',
                              opacity: isWithinMargin ? 1 : 0.5,
                              cursor: isWithinMargin ? 'pointer' : 'not-allowed',
                              backgroundColor: isWithinMargin ? 'var(--success)' : 'var(--bg-secondary)',
                              color: isWithinMargin ? 'white' : 'var(--text-secondary)',
                              width: '100%'
                            }}
                            disabled={!isWithinMargin}
                          >
                            {isWithinMargin ? '✓ Administer Now' : 'Not in window'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Log in to administer</div>
                      )}
                      
                      {user?.role === 'ADMIN' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <Link href={`/edit/${med.id}`} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)' }}>Edit</Link>
                          <button onClick={() => handleDelete(med.id)} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'transparent', color: 'var(--danger)' }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Recent Administrations
              </h3>
              <div className="flex-col" style={{ gap: '1rem' }}>
                {recent.length === 0 ? <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No recent logs.</p> : recent.slice(0, 10).map(log => (
                  <div key={log.id} style={{ fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 'bold' }}>{log.medication.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>By: {log.administeredByUser?.name || log.administeredByUser?.username || 'Unknown'}</span>
                      {log.notes && <span style={{ fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '0 0.3rem', borderRadius: '4px' }}>Note: {log.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
