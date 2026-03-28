'use client'
import { useEffect, useState, useRef } from 'react'
import { Navigation } from '@/components/Navigation'
import { useSettings } from '@/components/ThemeProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { ConflictModal, ConflictData } from '@/components/ConflictModal'
import { AmbiguityModal, AmbiguityData } from '@/components/AmbiguityModal'
export default function Dashboard() {
  const router = useRouter()
  const { muteAudio } = useSettings()
  const [user, setUser] = useState<any>(null)
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  
  const snoozedUntil = useRef<Record<string, number>>({})
  // We need state to trigger re-renders for snoozed buttons
  const [snoozeTrigger, setSnoozeTrigger] = useState(0)
  
  
  
  // Track if we need explicit gesture for Android permissions
  const [needsPermission, setNeedsPermission] = useState(false)
  
  const [dbError, setDbError] = useState<string | null>(null)
  const [administeringMed, setAdministeringMed] = useState<any>(null)
  const [administerNotes, setAdministerNotes] = useState('')
  const [adminTimeStr, setAdminTimeStr] = useState('')
  const [administerLoading, setAdministerLoading] = useState(false)
  const [accountUsers, setAccountUsers] = useState<any[]>([])
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('')
  const [snoozingMed, setSnoozingMed] = useState<any>(null)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  
  const [conflictData, setConflictData] = useState<ConflictData | null>(null)
  const [ambiguityData, setAmbiguityData] = useState<AmbiguityData | null>(null)
  const [isOverride, setIsOverride] = useState(false)
  const [violationDetail, setViolationDetail] = useState<{title: string, message: string} | null>(null)

  const showViolationDetails = (med: any) => {
    const type = med.warningType || (med.isOverride ? 'OVERRIDE' : 'UNKNOWN');
    let msg = "This schedule event deviated from typical parameters.";
    if (type === 'INTERVAL') msg = "This dose violates the minimum required time interval between administrations.";
    if (type === 'OFFSET_VIOLATION' || type === 'OVERRIDE') msg = "This dose was manually offset from its optimal schedule, deviating from the baseline rhythm.";
    if (type === 'RELATIONSHIP') msg = "This dose conflicts with a defined medication relationship rule.";
    
    setViolationDetail({ title: "Schedule Violation", message: msg });
  }

  // Reset override if the user changes the medication or time
  useEffect(() => {
    setIsOverride(false)
  }, [administeringMed?.id, adminTimeStr])

  const fetchData = async () => {
    try {
      const [meRes, upcomingRes, recentRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/medications/upcoming?hours=24'),
        fetch('/api/logs/recent'),
        fetch('/api/users')
      ])
      
      if (!meRes.ok) {
        setDbError('Cannot reach the authentication service. Please check your network connection.')
      } else if (upcomingRes.status >= 500 || recentRes.status >= 500 || usersRes.status >= 500) {
        setDbError('Database error. Our server is having trouble reaching the data store.')
      } else {
        setDbError(null)
      }
      
      const meData = await meRes.json()
      if (!meData.user) {
        router.push('/login')
        return
      }
      setUser(meData.user)
      setSelectedCaregiverId(meData.user.id)
      
      if (upcomingRes.ok) {
        const uData = await upcomingRes.json()
        setUpcoming(uData.upcoming || [])
      }
      
      if (recentRes.ok) {
        const rData = await recentRes.json()
        setRecent(rData.logs || [])
      }

      if (usersRes.ok) {
        const uData = await usersRes.json()
        setAccountUsers(uData.users || [])
      }
    } catch (err) {
      console.error(err)
      setDbError('Network error. Database is unreachable.')
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

  useEffect(() => {
    if (administeringMed && !adminTimeStr) {
      const pad = (n: number) => n.toString().padStart(2, '0')
      let d = new Date()
      if (administeringMed.status === 'SKIPPED') {
        const scheduledTimeStr = administeringMed.scheduledAt || administeringMed.displayTime || administeringMed.nextDue || administeringMed.time || administeringMed.originalTime
        if (scheduledTimeStr) {
          d = new Date(scheduledTimeStr)
        }
      }
      setAdminTimeStr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
  }, [administeringMed])

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

  
  const handleAdminister = async () => {
    if (!user || !administeringMed) return
    setAdministerLoading(true)
    try {
      const payload: any = {
        medicationId: administeringMed.id,
        administeredAt: adminTimeStr ? new Date(adminTimeStr).toISOString() : new Date().toISOString(),
        administeredByUserId: selectedCaregiverId
      };
      if (administeringMed.nextDue) payload.scheduledAt = administeringMed.nextDue;
      if (administerNotes) payload.notes = administerNotes;
      
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          scheduleId: administeringMed.scheduleId,
          eventId: administeringMed.instanceId || administeringMed.eventId || null,
          status: administeringMed.status || 'ADMINISTERED',
          isOverride
        })
      })
      if (res.ok) {
        setAdministeringMed(null)
        setAdministerNotes('')
        setAdminTimeStr('')
        setIsOverride(false)
        fetchData()
      } else {
        const data = await res.json()
        if (res.status === 409 && data.error === 'CONFLICT') {
          setConflictData({
            message: data.message,
            violations: data.violations,
            action: 'ADMINISTER',
            data: payload
          })
        } else if (res.status === 409 && data.error === 'AMBIGUOUS_EVENT') {
          setAmbiguityData({
            pastEvent: data.pastEvent,
            futureEvent: data.futureEvent,
            data: payload
          })
        } else {
          console.error('Failed to administer medication:', res.status, data);
          alert(data.error || 'Failed to administer medication.');
        }
      }
    } catch (error) {
      console.error('Error administering medication:', error);
      alert('An error occurred while administering medication.');
    } finally {
      setAdministerLoading(false)
    }
  }

  const handleDelete = async (medId: string) => {
    if (!confirm('Delete this medication permanently?')) return
    await fetch(`/api/medications/${medId}`, { method: 'DELETE' })
    fetchData()
  }

  const handleSnooze = (med: any) => {
    setSnoozingMed(med)
  }

  const confirmSnooze = (med: any, minutes: number) => {
    snoozedUntil.current[med.id] = Date.now() + minutes * 60 * 1000
    setSnoozingMed(null)
    setSnoozeTrigger(snoozeTrigger + 1)
  }

  return (
    <main className="container">
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

      {dbError && (
        <div className="glass-panel" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)', marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--danger)' }}>⚠️ Connection Error</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{dbError}</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>
      ) : (
        <div className="grid dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                Upcoming Medications
              </h2>
              <Link href="/calendar" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '20px', background: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '1px solid var(--glass-border)', textDecoration: 'none' }}>
                📅 View Timeline
              </Link>
            </div>
            
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
                  <div key={med.instanceId || med.id} className={`glass-panel med-card-content ${med.isOverdue ? 'pulse-red-bg' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: med.isOverdue ? '4px solid var(--danger)' : '1px solid var(--glass-border)' }}>
                    <div style={{ width: '60px', height: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: med.color || 'var(--bg-secondary)', borderRadius: '12px', color: 'white' }}>
                      {med.imageUrl ? (
                        <img src={med.imageUrl} alt={med.name} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                      ) : (
                        (() => {
                          const LucideIcon = (Icons as any)[med.icon || 'Pill'] || Icons.Pill || (Icons as any).Activity
                          return LucideIcon ? <LucideIcon size={32} /> : <span>📦</span>
                        })()
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem' }}>{med.name}</h3>
                        {med.warningType && (
                           <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); showViolationDetails(med); }} title="Click for violation details">
                             <Icons.AlertTriangle size={18} color="#f59e0b" className="warning-pulse" />
                           </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {med.patient && <span style={{ fontSize: '0.7rem', background: 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{med.patient.name}</span>}
                          {med.scheduleName && <span style={{ fontSize: '0.7rem', background: 'var(--accent-primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{med.scheduleName}</span>}
                        </div>
                      </div>
                      {med.alias && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{med.alias}</p>}
                      <p style={{ fontSize: '0.95rem', marginTop: '0.5rem', color: med.isOverdue ? 'var(--danger)' : 'inherit', fontWeight: med.isOverdue ? 'bold' : 'normal' }}>
                        {med.isOverdue ? '⚠️ Overdue since ' : '🕒 Due at '}
                        {new Date(med.nextDue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isSnoozed && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', color: 'var(--accent-secondary)' }}>(Snoozed)</span>}
                      </p>
                    </div>
                    <div className="med-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '140px' }}>
                      {user && isDueSoon && !isSnoozed && (
                        <button onClick={() => handleSnooze(med)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                          💤 Snooze
                        </button>
                      )}
                      
                      {user ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', width: '100%' }}>
                          {med.isOverdue && !isWithinMargin ? (
                            (() => {
                              const now = new Date()
                              const tzOffset = now.getTimezoneOffset() * 60000
                              const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
                              return (
                                <Link 
                                  href={`/log?medicationId=${med.id}&administeredAt=${localISO}&notes=Overdue dose&scheduleId=${med.scheduleId}&eventId=${med.instanceId || med.id}`}
                                  className="btn btn-danger"
                                  style={{ 
                                    padding: '0.6rem 1rem', 
                                    borderRadius: '24px',
                                    backgroundColor: 'var(--danger)',
                                    color: 'white',
                                    width: '100%',
                                    fontSize: '0.9rem',
                                    textAlign: 'center',
                                    textDecoration: 'none'
                                  }}
                                >
                                  ⏳ Log Past
                                </Link>
                              )
                            })()
                          ) : (
                            <button 
                              onClick={() => {
                                if (!isWithinMargin) return;
                                setAdministeringMed({ ...med, status: 'ADMINISTERED' })
                                setAdministerNotes('')
                              }}
                              className={`btn ${isWithinMargin ? 'btn-success' : ''}`} 
                              style={{ 
                                padding: '0.6rem 1rem', 
                                borderRadius: '24px',
                                opacity: isWithinMargin ? 1 : 0.5,
                                cursor: isWithinMargin ? 'pointer' : 'not-allowed',
                                backgroundColor: isWithinMargin ? 'var(--success)' : 'var(--bg-secondary)',
                                color: isWithinMargin ? 'white' : 'var(--text-secondary)',
                                width: '100%',
                                fontSize: '0.9rem'
                              }}
                              disabled={!isWithinMargin}
                            >
                              {isWithinMargin ? '✓ Administer' : 'Not in window'}
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setAdministeringMed({ ...med, status: 'SKIPPED' })
                              setAdministerNotes('Skipped dose')
                            }}
                            className="btn"
                            style={{
                              padding: '0.6rem 1rem',
                              borderRadius: '24px',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--accent-primary)',
                              width: '100%',
                              fontSize: '0.9rem',
                              borderColor: 'var(--accent-primary)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              opacity: 0.8
                            }}
                          >
                            ⏭️ Skip
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Log in to administer</div>
                      )}
                      
                      {/* Edit/Delete removed to avoid confusion with master management */}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '0.75rem 1rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.9 }}>
                <span>Recent</span>
                <Link href="/logs" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' }}>All →</Link>
              </h3>
              <div className="flex-col" style={{ gap: '0' }}>
                {recent.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>No recent logs.</p>
                ) : (
                  recent.slice(0, 10).map((log, idx) => {
                    const medIcon = log.schedule?.icon || log.medication.schedules?.[0]?.icon || 'Pill'
                    const medColor = log.schedule?.color || log.medication.schedules?.[0]?.color || 'var(--accent-primary)'
                    const LucideIcon = (Icons as any)[medIcon] || Icons.Pill
                    return (
                      <div 
                        key={log.id} 
                        onClick={() => setSelectedLog(log)}
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '0.6rem 0',
                          borderTop: idx === 0 ? 'none' : '1px solid var(--glass-border)',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem'
                        }}
                        className="hover-subtle"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '6px', 
                              background: medColor, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              flexShrink: 0
                            }}>
                              <LucideIcon size={14} />
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.medication.name}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(log.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '2rem' }}>
                          <span style={{ opacity: 0.8 }}>{log.administeredByUser?.name || log.administeredByUser?.username || 'Caregiver'}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                            {log.notes && <Icons.MessageSquare size={12} style={{ opacity: 0.5 }} />}
                            {(user?.role === 'ADMIN' || user?.id === log.administeredByUserId) && (
                              <Link href={`/log/${log.id}/edit`} style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', textDecoration: 'none', background: 'var(--glass-border)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Edit</Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div 
          onClick={() => setSelectedLog(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="glass-panel" 
            style={{ width: '100%', maxWidth: '350px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '1.5rem' }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              {(() => {
                const medIcon = selectedLog.schedule?.icon || selectedLog.medication.schedules?.[0]?.icon || 'Pill'
                const medColor = selectedLog.schedule?.color || selectedLog.medication.schedules?.[0]?.color || 'var(--accent-primary)'
                const LucideIcon = (Icons as any)[medIcon] || Icons.Pill
                return (
                  <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: medColor, borderRadius: '12px', color: 'white' }}>
                    <LucideIcon size={28} />
                  </div>
                )
              })()}
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedLog.medication.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedLog.medication.alias || 'Medication'}</p>
              </div>
            </div>

            <div className="flex-col" style={{ gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span style={{ fontWeight: '600', color: selectedLog.status === 'SKIPPED' ? 'var(--danger)' : 'var(--success)' }}>
                  {selectedLog.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Time</span>
                <span style={{ fontWeight: '500' }}>{new Date(selectedLog.administeredAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Caregiver</span>
                <span style={{ fontWeight: '500' }}>{selectedLog.administeredByUser?.name || selectedLog.administeredByUser?.username || 'Unknown'}</span>
              </div>
              {selectedLog.notes && (
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Notes:</p>
                  <p style={{ fontStyle: 'italic' }}>"{selectedLog.notes}"</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              {(user?.role === 'ADMIN' || user?.id === selectedLog.administeredByUserId) && (
                <button 
                  className="btn" 
                  style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}
                  onClick={() => router.push(`/log/${selectedLog.id}/edit`)}
                >
                  Edit Log
                </button>
              )}
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {administeringMed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Confirm Administration</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Are you sure you want to log <strong>{administeringMed.name}</strong> for <strong>{administeringMed.patient?.name}</strong>?
            </p>

            <div className="flex-col" style={{ gap: '1rem' }}>
              {accountUsers.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Administered By</label>
                  <select 
                    className="input-field" 
                    value={selectedCaregiverId} 
                    onChange={e => setSelectedCaregiverId(e.target.value)}
                  >
                    {accountUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Time</label>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={adminTimeStr}
                  onChange={e => setAdminTimeStr(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Notes (Optional)</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  placeholder="e.g. Dosage, reaction..." 
                  value={administerNotes}
                  onChange={e => setAdministerNotes(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn" 
                  onClick={() => { setAdministeringMed(null); setAdminTimeStr(''); setIsOverride(false); }}
                  style={{ flex: 1, background: 'var(--bg-secondary)' }}
                >
                  Cancel
                </button>
                <button id="submit-administer-btn"
                  className="btn btn-success" 
                  onClick={handleAdminister}
                  style={{ flex: 2 }}
                  disabled={administerLoading}
                >
                  {administerLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {snoozingMed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '350px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icons.Clock size={20} />
              <span>Snooze Duration</span>
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              How long would you like to snooze alerts for <strong>{snoozingMed.name}</strong>?
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[1, 5, 10, 15].map(m => (
                <button key={m} onClick={() => confirmSnooze(snoozingMed, m)} className="btn" style={{ background: 'var(--bg-secondary)', padding: '0.75rem' }}>
                  {m}m
                </button>
              ))}
              <button 
                onClick={() => {
                  const marginMin = snoozingMed.marginMinutes || 30
                  const smartMin = Math.max(1, Math.floor(marginMin / 3))
                  confirmSnooze(snoozingMed, smartMin)
                }} 
                className="btn btn-primary"
                style={{ gridColumn: 'span 2', padding: '0.75rem' }}
              >
                Default ({Math.max(1, Math.floor((snoozingMed.marginMinutes || 30) / 3))}m)
              </button>
              <button onClick={() => setSnoozingMed(null)} className="btn" style={{ gridColumn: 'span 2', background: 'transparent', border: '1px solid var(--glass-border)', marginTop: '0.5rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {conflictData && (
        <ConflictModal
          conflictData={conflictData}
          onCancel={() => {
            setConflictData(null)
            setIsOverride(false)
          }}
          onOverride={(action, data) => {
            setConflictData(null)
            setIsOverride(true)
            setTimeout(() => {
                const submitBtn = document.getElementById('submit-administer-btn');
                if (submitBtn) submitBtn.click();
            }, 100);
          }}
        />
      )}

      {ambiguityData && (
        <AmbiguityModal
          ambiguityData={ambiguityData}
          onCancel={() => setAmbiguityData(null)}
          onResolve={(selectedEventId) => {
            setAmbiguityData(null)
            setAdministeringMed({ ...administeringMed, eventId: selectedEventId })
            setTimeout(() => {
                const submitBtn = document.getElementById('submit-administer-btn');
                if (submitBtn) submitBtn.click();
            }, 100);
          }}
        />
      )}

      {/* Violation Detail Modal */}
      {violationDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
              <Icons.AlertTriangle size={24} /> {violationDetail.title}
            </h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{violationDetail.message}</p>
            <button className="btn" style={{ width: '100%', background: 'var(--bg-secondary)' }} onClick={() => setViolationDetail(null)}>Close</button>
          </div>
        </div>
      )}

    </main>
  )
}
