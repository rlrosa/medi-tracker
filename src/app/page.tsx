'use client'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { useSettings } from '@/components/ThemeProvider'
import Link from 'next/link'

// Base64 short notification beep
const beepSoundUrl = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'

export default function Dashboard() {
  const { muteAudio } = useSettings()
  const [user, setUser] = useState<any>(null)
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notifiedMeds, setNotifiedMeds] = useState<Set<string>>(new Set())

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
    // Poll every minute
    const interval = setInterval(fetchData, 60000)
    
    // Request notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission()
    }
    
    return () => clearInterval(interval)
  }, [])

  const checkNotifications = (meds: any[]) => {
    const now = new Date()
    meds.forEach(med => {
      if (med.isOverdue || (new Date(med.nextDue).getTime() - now.getTime() < 10 * 60 * 1000)) {
        // Due soon or overdue
        if (!notifiedMeds.has(med.id)) {
          triggerNotification(med)
          setNotifiedMeds(prev => new Set(prev).add(med.id))
        }
      }
    })
  }

  const triggerNotification = (med: any) => {
    if (!muteAudio) {
      try {
        const audio = new Audio(beepSoundUrl)
        audio.play().catch(e => console.log('Audio play ignored by browser', e))
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
    if (!user) return alert('You must be logged in to administer medication.')
    
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId: medId })
    })

    if (res.ok) {
      fetchData() // Refresh
    } else {
      alert('Failed to log administration')
    }
  }

  return (
    <div className="container">
      <Navigation />
      
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Main Column */}
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
              Upcoming Medications (24h)
            </h2>
            
            {upcoming.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', opacity: 0.7 }}>
                No medications due in the next 24 hours.
              </div>
            ) : (
              upcoming.map(med => (
                <div key={med.id} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: med.isOverdue ? '4px solid var(--danger)' : '1px solid var(--glass-border)' }}>
                  {med.imageUrl && (
                    <img src={med.imageUrl} alt={med.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{med.name}</h3>
                    {med.alias && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{med.alias}</p>}
                    <p style={{ fontSize: '0.95rem', marginTop: '0.5rem', color: med.isOverdue ? 'var(--danger)' : 'inherit', fontWeight: med.isOverdue ? 'bold' : 'normal' }}>
                      {med.isOverdue ? '⚠️ Overdue since ' : '🕒 Due at '}
                      {new Date(med.nextDue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    {user ? (
                      <button 
                        onClick={() => handleAdminister(med.id)}
                        className="btn btn-success" 
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '24px', fontSize: '1rem' }}
                      >
                        ✓ Administer Now
                      </button>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        Log in to administer
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Sidebar */}
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Recent Administrations
              </h3>
              
              <div className="flex-col" style={{ gap: '1rem' }}>
                {recent.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No recent logs.</p>
                ) : (
                  recent.slice(0, 10).map(log => (
                    <div key={log.id} style={{ fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{log.medication.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        By: {log.administeredByUser?.name || log.administeredByUser?.username || 'Unknown'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {!user && (
              <div className="glass-panel" style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--accent-primary)' }}>
                <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Read-Only Mode</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  You are viewing the tracker as a guest. You will still receive notifications for due medications if you leave this tab open!
                </p>
              </div>
            )}
            
          </div>

        </div>
      )}
    </div>
  )
}
