'use client'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import Link from 'next/link'

export default function CalendarView() {
  const router = useRouter()
  const [days, setDays] = useState(3)
  const [viewDate, setViewDate] = useState(new Date())
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [administeringMed, setAdministeringMed] = useState<any>(null)
  const [administerNotes, setAdministerNotes] = useState('')
  const [administerLoading, setAdministerLoading] = useState(false)
  const [accountUsers, setAccountUsers] = useState<any[]>([])
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('')

  const fetchData = async () => {
    try {
      const hours = days * 24
      const start = new Date(viewDate)
      start.setHours(0, 0, 0, 0)
      
      const [meRes, upcomingRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/medications/upcoming?hours=${hours}&startDate=${start.toISOString()}`),
        fetch('/api/users')
      ])
      
      const meData = await meRes.json()
      if (!meData.user) {
        router.push('/login')
        return
      }
      setUser(meData.user)
      setSelectedCaregiverId(meData.user.id)
      
      if (usersRes.ok) {
        const uData = await usersRes.json()
        setAccountUsers(uData.users || [])
      }
      
      if (upcomingRes.ok) {
        const uData = await upcomingRes.json()
        setUpcoming(uData.upcoming || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [days, viewDate])

  const handleAdminister = async () => {
    if (!user || !administeringMed) return
    setAdministerLoading(true)
    try {
      const payload: any = {
        medicationId: administeringMed.id,
        administeredAt: new Date().toISOString(),
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
          status: administeringMed.status || 'ADMINISTERED'
        })
      })
      if (res.ok) {
        setAdministeringMed(null)
        setSelectedEntry(null)
        setAdministerNotes('')
        fetchData()
      } else {
        alert('Failed to administer medication.');
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred.');
    } finally {
      setAdministerLoading(false)
    }
  }

  const nextRange = () => {
    const next = new Date(viewDate)
    next.setDate(next.getDate() + days)
    setViewDate(next)
  }

  const prevRange = () => {
    const prev = new Date(viewDate)
    prev.setDate(prev.getDate() - days)
    setViewDate(prev)
  }

  const resetToToday = () => {
    setViewDate(new Date())
  }

  const getDaysArray = () => {
    const arr = []
    const start = new Date(viewDate)
    start.setHours(0,0,0,0)
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      arr.push(d)
    }
    return arr
  }

  const dayDates = getDaysArray()

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      <Navigation />
      
      <div className="flex-col" style={{ gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Medication Timeline</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {dayDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
              {' - '} 
              {dayDates[dayDates.length-1].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <button onClick={prevRange} className="btn" style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)' }} title="Previous Range">
              <Icons.ChevronLeft size={20} />
            </button>
            <button onClick={resetToToday} className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}>Today</button>
            <button onClick={nextRange} className="btn" style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)' }} title="Next Range">
              <Icons.ChevronRight size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '12px' }}>
            {[3, 5, 7].map(d => (
              <button 
                key={d} 
                onClick={() => { setDays(d); setViewDate(new Date()); }} 
                className={`btn ${days === d ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 1rem', borderRadius: '10px', fontSize: '0.8rem', background: days === d ? 'var(--accent-primary)' : 'transparent', color: days === d ? 'white' : 'inherit' }}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '10rem' }}>Loading timeline...</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${days}, 1fr)`, 
            gap: '1px',
            background: 'var(--glass-border)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            minHeight: '800px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            {dayDates.map((date, idx) => {
              const dayMeds = upcoming.filter(m => {
                const medDate = new Date(m.nextDue)
                return medDate.getDate() === date.getDate() && 
                       medDate.getMonth() === date.getMonth() &&
                       medDate.getFullYear() === date.getFullYear()
              })

              return (
                <div key={idx} style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', position: 'relative', minWidth: '0' }}>
                  <div style={{ 
                    padding: '1rem', 
                    textAlign: 'center', 
                    borderBottom: '1px solid var(--glass-border)',
                    background: 'var(--bg-secondary)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                  </div>
                  
                  <div style={{ position: 'relative', height: '2880px', background: 'rgba(255,255,255,0.02)', width: '100%' }}>
                    {/* Hour Markers */}
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} style={{ 
                        position: 'absolute', 
                        top: `${(hour / 24) * 100}%`, 
                        left: 0, right: 0, 
                        borderTop: '1px solid var(--glass-border)',
                        opacity: hour % 4 === 0 ? 0.3 : 0.1,
                        pointerEvents: 'none',
                        height: '1px'
                      }}>
                        {hour % 2 === 0 && (
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginLeft: '4px', background: 'var(--bg-primary)', padding: '0 2px' }}>
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Meds */}
                    {(() => {
                      // Sort by time
                      const sorted = [...dayMeds].sort((a,b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
                      
                      // Calculate overlaps and columns
                      const layouts: any[] = []
                      const activeGroups: any[][] = []

                      sorted.forEach(med => {
                        const medTime = new Date(med.nextDue).getTime()
                        const medEnd = medTime + 45 * 60 * 1000 // Treat as 45min for overlap testing
                        
                        // Find a group or start a new one
                        let foundGroup = activeGroups.find(g => {
                           const lastEnd = Math.max(...g.map(m => new Date(m.nextDue).getTime() + 45 * 60 * 1000))
                           return medTime < lastEnd
                        })

                        if (!foundGroup) {
                          foundGroup = []
                          activeGroups.push(foundGroup)
                        }
                        foundGroup.push(med)
                      })

                      return sorted.map((med, mIdx) => {
                        const medDate = new Date(med.nextDue)
                        const minutes = medDate.getHours() * 60 + medDate.getMinutes()
                        const top = (minutes / 1440) * 100
                        
                        // Find which group this med belongs to
                        const group = activeGroups.find(g => g.includes(med)) || [med]
                        const colIdx = group.indexOf(med)
                        const totalCols = group.length
                        
                        const LucideIcon = (Icons as any)[med.icon || 'Pill'] || Icons.Pill
                        const isNight = medDate.getHours() >= 20 || medDate.getHours() < 6

                        return (
                          <div 
                            key={med.instanceId || mIdx}
                            onClick={() => setSelectedEntry(med)}
                            className="glass-panel"
                            style={{
                              position: 'absolute',
                              top: `${top}%`,
                              left: `${(colIdx / totalCols) * 100}%`,
                              width: `${(1 / totalCols) * 100}%`,
                              padding: '0.4rem',
                              fontSize: '0.7rem',
                              borderLeft: `3px solid ${med.color || 'var(--accent-primary)'}`,
                              background: isNight ? 'rgba(99, 102, 241, 0.15)' : 'var(--glass-bg)',
                              zIndex: 5,
                              minHeight: '48px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', flex: 1 }}>
                                <LucideIcon size={12} style={{ color: med.color || 'var(--accent-primary)' }} />
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{med.name}</span>
                              </div>
                              {totalCols === 1 && (
                                <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                   <button 
                                     onClick={() => { setAdministeringMed({...med, status: 'ADMINISTERED'}); setAdministerNotes(''); }} 
                                     style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--success)', opacity: 0.8 }}
                                     title="Administer"
                                   >
                                     <Icons.Check size={12} strokeWidth={3} />
                                   </button>
                                   <button 
                                     onClick={() => { if(confirm(`Skip ${med.name}?`)) { setAdministeringMed({...med, status: 'SKIPPED'}); setAdministerNotes('Skipped dose'); } }} 
                                     style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--accent-primary)', opacity: 0.8 }}
                                     title="Skip"
                                   >
                                     <Icons.SkipForward size={12} />
                                   </button>
                                   <button 
                                     onClick={() => router.push(`/edit/${med.id}`)} 
                                     style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-secondary)', opacity: 0.8 }}
                                     title="Edit"
                                   >
                                     <Icons.Settings size={12} />
                                   </button>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ opacity: 0.8 }}>{medDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isNight && <Icons.Moon size={10} style={{ opacity: 0.6 }} />}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1.5rem', marginTop: '2rem' }}>
          <p>Each column represents one full day. Medications are positioned vertically by time of day.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
             <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' }}>← Return to Dashboard</Link>
             <Link href="/add" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' }}>+ Add Medication</Link>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {selectedEntry && !administeringMed && (
        <div 
          onClick={() => setSelectedEntry(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="glass-panel" 
            style={{ width: '100%', maxWidth: '450px', boxShadow: '0 20px 80px rgba(0,0,0,0.8)', padding: '2rem' }}
          >
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div style={{ width: '90px', height: '90px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedEntry.color || 'var(--accent-primary)', borderRadius: '22px', color: 'white', boxShadow: `0 10px 20px ${(selectedEntry.color || '#6366f1')}44` }}>
                {(() => {
                  const LucideIcon = (Icons as any)[selectedEntry.icon || 'Pill'] || Icons.Pill
                  return <LucideIcon size={44} />
                })()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: '700' }}>{selectedEntry.name}</h3>
                {selectedEntry.alias && <p style={{ color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>{selectedEntry.alias}</p>}
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icons.Clock size={14} /> {new Date(selectedEntry.nextDue).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icons.Calendar size={14} /> {selectedEntry.scheduleName}</p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icons.User size={14} /> {selectedEntry.patient?.name}</p>
                </div>
              </div>
            </div>

            <div className="flex-col" style={{ gap: '0.75rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ height: '54px', fontSize: '1.2rem', background: 'var(--success)', color: 'white', width: '100%' }}
                onClick={() => { setAdministeringMed({...selectedEntry, status: 'ADMINISTERED'}); setAdministerNotes(''); }}
              >
                ✓ Administer Now
              </button>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button 
                  className="btn" 
                  style={{ height: '54px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', width: '100%' }}
                  onClick={() => { if(confirm(`Skip ${selectedEntry.name}?`)) { setAdministeringMed({...selectedEntry, status: 'SKIPPED'}); setAdministerNotes('Skipped dose'); } }}
                >
                  ⏭️ Skip Dose
                </button>
                <button 
                  className="btn" 
                  style={{ height: '54px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', width: '100%' }}
                  onClick={() => router.push(`/edit/${selectedEntry.id}`)}
                >
                  ⚙️ Edit Rules
                </button>
              </div>
              
              <button 
                className="btn" 
                style={{ marginTop: '1rem', background: 'transparent', width: '100%', color: 'var(--text-secondary)' }}
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Confirmation Modal */}
      {administeringMed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{administeringMed.status === 'SKIPPED' ? 'Confirm Skip' : 'Confirm Administration'}</h3>
            
            <div className="flex-col" style={{ gap: '1rem' }}>
              {accountUsers.length > 0 && administeringMed.status !== 'SKIPPED' && (
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Notes (Optional)</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  value={administerNotes}
                  onChange={e => setAdministerNotes(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button className="btn" onClick={() => setAdministeringMed(null)} style={{ flex: 1, background: 'var(--bg-secondary)' }}>
                  Cancel
                </button>
                <button className="btn btn-success" onClick={handleAdminister} style={{ flex: 2 }} disabled={administerLoading}>
                  {administerLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
