'use client'
import { useEffect, useState, useRef, use } from 'react'
import { Navigation } from '@/components/Navigation'
import { useSettings } from '@/components/ThemeProvider'
import Link from 'next/link'


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
  
  // Add a visible in-app toast for notification fallback
  const [activeToast, setActiveToast] = useState<string | null>(null)
  
  // Track if we need explicit gesture for Android permissions
  const [needsPermission, setNeedsPermission] = useState(false)

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
      if (Notification.permission === 'default') {
        setNeedsPermission(true)
      }
    }
    
    return () => clearInterval(interval)
  }, [])

  const requestPermissions = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      setNeedsPermission(perm === 'default')
    }
    // Unlock Audio Context silently
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // completely silent
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
  }

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
    // Show in-app visual toast to guarantee we see logic triggering
    setActiveToast(`Notification: It is time to take ${med.name}!`)
    setTimeout(() => setActiveToast(null), 5000)

    if (!muteAudio) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch(e) { console.log('Audio beep ignored by browser restriction') }
    }
    
    // Attempt standard OS notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Medication Due!', {
          body: `It is time to take ${med.name}`,
          icon: med.imageUrl || undefined
        })
      } catch(e) { console.log('OS notification blocked.') }
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
      
      {needsPermission && (
        <div className="glass-panel" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'var(--accent-primary)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>Enable Background Alerts</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>We need your permission to send push notifications and play sounds when a medication is due.</p>
          </div>
          <button onClick={requestPermissions} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '24px' }}>
            Allow Alerts
          </button>
        </div>
      )}

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
                  <div key={med.instanceId || med.id} className={`glass-panel ${med.isOverdue ? 'pulse-red-bg' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: med.isOverdue ? '4px solid var(--danger)' : '1px solid var(--glass-border)' }}>
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
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Recent Administrations</span>
                <Link href="/logs" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'normal' }}>See All →</Link>
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
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>By: {log.administeredByUser?.name || log.administeredByUser?.username || 'Unknown'}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {log.notes && <span style={{ fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '0 0.3rem', borderRadius: '4px' }}>Note: {log.notes}</span>}
                        {(user?.role === 'ADMIN' || user?.id === log.administeredByUserId) && (
                          <Link href={`/log/${log.id}/edit`} style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', textDecoration: 'none', background: 'var(--glass-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Edit</Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeToast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          background: 'var(--accent-primary)', color: 'white',
          padding: '1rem 1.5rem', borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          fontWeight: 'bold', animation: 'fadeIn 0.3s ease-out'
        }}>
          🔔 {activeToast}
        </div>
      )}
    </div>
  )
}
