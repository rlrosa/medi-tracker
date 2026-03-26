'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import * as Icons from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SUGGESTED_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
]
const ICON_OPTIONS = [
  'Pill', 'Droplet', 'Thermometer', 'Heart', 'Activity', 'Brain', 'Eye', 'Baby'
]

export default function AddMedication() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  
  const [form, setForm] = useState({
    name: '',
    alias: '',
    imageUrl: '',
    patientId: '',
  })

  const [schedules, setSchedules] = useState<any[]>([{
    name: 'Primary Schedule',
    intervalHours: '',
    marginMinutes: '30',
    startDate: '',
    endDate: '',
    color: SUGGESTED_COLORS[Math.floor(Math.random() * SUGGESTED_COLORS.length)],
    icon: 'Pill',
    daysOfWeek: ''
  }])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/')
        } else {
          setIsAdmin(true)
          fetchPatients()
          fetchTemplates()
        }
      })
  }, [router])

  const fetchTemplates = async () => {
    const res = await fetch('/api/medication-templates')
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates || [])
    }
  }

  const fetchPatients = async () => {
    const res = await fetch('/api/patients')
    if (res.ok) {
      const data = await res.json()
      setPatients(data.patients || [])
      if (data.patients?.length > 0) {
        setForm(prev => ({ ...prev, patientId: data.patients[0].id }))
      }
    }
  }

  const handleTemplateSelect = (t: any) => {
    setForm(prev => ({ ...prev, name: t.name }))
    setSchedules([{
      name: 'Primary Schedule',
      intervalHours: t.intervalHours?.toString() || '',
      color: t.color || SUGGESTED_COLORS[0],
      icon: t.icon || 'Pill',
      marginMinutes: '30',
      daysOfWeek: ''
    }])
  }

  const updateSchedule = (idx: number, updatedFields: any) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, ...updatedFields } : s))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
      ...form,
      schedules: schedules.map(s => ({
        ...s,
        intervalHours: s.intervalHours ? parseInt(s.intervalHours, 10) : null,
        marginMinutes: s.marginMinutes ? parseInt(s.marginMinutes, 10) : 30,
        startDate: s.startDate ? new Date(s.startDate).toISOString() : null,
        endDate: s.endDate ? new Date(s.endDate).toISOString() : null,
      }))
    }

    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setLoading(false)
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to add medication')
    }
  }

  if (!isAdmin) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Checking permissions...</div>

  return (
    <div className="container">
      <Navigation />
      
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Add New Medication</h2>

        {templates.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Quick Templates</label>
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {templates.map(t => (
                <button
                  key={t.id || t.name}
                  type="button"
                  onClick={() => handleTemplateSelect(t)}
                  className="glass-panel"
                  style={{ 
                    flexShrink: 0, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    fontSize: '0.85rem', whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color }}></div>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex-col" style={{ gap: '1rem' }}>
          {patients.length > 1 && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Patient *</label>
              <select required className="input-field" value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})}>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Name *</label>
            <input required type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Image URL (Optional)</label>
            <input type="url" className="input-field" placeholder="https://..." value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1rem 0' }} />
          
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Schedules
            <button 
              type="button" 
              onClick={() => setSchedules([...schedules, { name: 'Dose', intervalHours: '24', marginMinutes: '30', color: '#3b82f6', icon: 'Pill' }])}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
            >
              + Add Schedule
            </button>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {schedules.map((s, sIdx) => {
              const currentDays = s.daysOfWeek ? s.daysOfWeek.split(',').map(Number) : []
              const toggleDay = (day: number) => {
                const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day]
                updateSchedule(sIdx, { daysOfWeek: newDays.sort((a,b) => a-b).join(',') })
              }

              return (
                <div key={sIdx} className="glass-panel" style={{ padding: '1rem', position: 'relative', border: '1px solid var(--accent-primary)' }}>
                  {schedules.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setSchedules(schedules.filter((_, i) => i !== sIdx))}
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Schedule Name (e.g. Bedtime)</label>
                    <input required type="text" className="input-field" value={s.name} onChange={e => updateSchedule(sIdx, { name: e.target.value })} />
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Color</label>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {SUGGESTED_COLORS.map(c => (
                          <div key={c} onClick={() => updateSchedule(sIdx, { color: c })} style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: s.color === c ? '2px solid white' : 'none', boxShadow: s.color === c ? '0 0 0 2px var(--accent-primary)' : 'none' }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Icon</label>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {ICON_OPTIONS.map(iconName => {
                          const LucideIcon = (Icons as any)[iconName] || Icons.Pill
                          return (
                            <div key={iconName} onClick={() => updateSchedule(sIdx, { icon: iconName })} style={{ padding: '0.1rem', borderRadius: '4px', cursor: 'pointer', background: s.icon === iconName ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: s.icon === iconName ? 'white' : 'inherit' }}>
                              <LucideIcon size={16} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Interval (Hours)</label>
                      <input type="number" min="1" className="input-field" value={s.intervalHours} onChange={e => updateSchedule(sIdx, { intervalHours: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Flex Window (Min)</label>
                      <input required type="number" min="0" className="input-field" value={s.marginMinutes} onChange={e => updateSchedule(sIdx, { marginMinutes: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Days of Week</label>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {DAYS.map((dayName, dayIdx) => (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleDay(dayIdx)}
                          className="btn"
                          style={{ 
                            padding: '0.4rem', borderRadius: '4px',
                            backgroundColor: currentDays.includes(dayIdx) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: currentDays.includes(dayIdx) ? 'white' : 'var(--text-primary)',
                            flex: 1, fontSize: '0.75rem'
                          }}
                        >
                          {dayName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Starts</label>
                      <input type="datetime-local" className="input-field" value={s.startDate} onChange={e => updateSchedule(sIdx, { startDate: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Ends (Optional)</label>
                      <input type="datetime-local" className="input-field" value={s.endDate} onChange={e => updateSchedule(sIdx, { endDate: e.target.value })} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '2rem', padding: '1rem' }}>
            {loading ? 'Adding...' : 'Add Medication & Schedules'}
          </button>
        </form>
      </div>
    </div>
  )
}
