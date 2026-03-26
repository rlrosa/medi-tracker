'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import * as Icons from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ICON_OPTIONS = [
  'Pill', 'Droplet', 'Thermometer', 'Heart', 'Activity', 'Brain', 'Eye', 'Baby', 
  'Stethoscope', 'Syringe', 'Bandage', 'Bones', 'Milk', 'Coffee', 'Sun', 'Moon', 
  'Cloud', 'Zap', 'Bell', 'Volume2', 'Shield', 'Clock', 'FlaskConical', 'Biohazard',
  'Ambulance', 'FirstAid', 'HandMetal', 'Smile'
]
const SUGGESTED_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
]

export default function EditMedication() {
  const router = useRouter()
  const params = useParams()
  const medId = params?.id
  
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [form, setForm] = useState({
    name: '',
    alias: '',
    imageUrl: '',
  })

  const [schedules, setSchedules] = useState<any[]>([{
    name: 'Primary Schedule',
    intervalHours: '',
    marginMinutes: '30',
    startDate: '',
    endDate: '',
    color: '#3b82f6',
    icon: 'Pill',
    daysOfWeek: null
  }])

  const formatForInput = (isoString: string) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0,16)
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/')
        } else {
          setIsAdmin(true)
          if (medId) loadMedication()
        }
      })
  }, [medId, router])

  const loadMedication = async () => {
    const res = await fetch('/api/medications')
    const data = await res.json()
    const med = data.medications?.find((m: any) => m.id === medId)
    if (med) {
      setForm({
        name: med.name || '',
        alias: med.alias || '',
        imageUrl: med.imageUrl || '',
      })
      if (med.schedules && med.schedules.length > 0) {
        setSchedules(med.schedules.map((s: any) => ({
          ...s,
          intervalHours: s.intervalHours ? s.intervalHours.toString() : '',
          marginMinutes: s.marginMinutes ? s.marginMinutes.toString() : '30',
          startDate: s.startDate ? formatForInput(s.startDate) : '',
          endDate: s.endDate ? formatForInput(s.endDate) : '',
          color: s.color || '#3b82f6',
          icon: s.icon || 'Pill',
          daysOfWeek: s.daysOfWeek
        })))
      }
    }
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

    const res = await fetch(`/api/medications/${medId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setLoading(false)
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to update medication')
    }
  }

  if (!isAdmin) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Checking permissions...</div>

  return (
    <div className="container">
      <Navigation />
      
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Edit Medication</h2>
        
        <form onSubmit={handleSubmit} className="flex-col" style={{ gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Name *</label>
            <input required type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Alias (Optional)</label>
            <input type="text" className="input-field" value={form.alias} onChange={e => setForm({...form, alias: e.target.value})} />
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
              onClick={() => setSchedules([...schedules, { name: 'New Schedule', intervalHours: '24', marginMinutes: '30', color: '#3b82f6', icon: 'Pill' }])}
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
                const newDays = currentDays.includes(day) ? currentDays.filter((d: number) => d !== day) : [...currentDays, day]
                updateSchedule(sIdx, { daysOfWeek: newDays.sort((a: number, b: number) => a - b).join(',') })
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
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Schedule Name (e.g. Morning Routine)</label>
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
                            <div key={iconName} onClick={() => updateSchedule(sIdx, { icon: iconName })} style={{ padding: '0.15rem', borderRadius: '4px', cursor: 'pointer', background: s.icon === iconName ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: s.icon === iconName ? 'white' : 'inherit' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Days of Week</label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {DAYS.map((dayName, dayIdx) => (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleDay(dayIdx)}
                          className="btn"
                          style={{ 
                            padding: '0.4rem', 
                            borderRadius: '4px',
                            backgroundColor: currentDays.includes(dayIdx) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: currentDays.includes(dayIdx) ? 'white' : 'var(--text-primary)',
                            flex: 1,
                            fontSize: '0.75rem'
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
            {loading ? 'Saving...' : 'Update Medication & Schedules'}
          </button>
        </form>
      </div>
    </div>
  )
}
