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
  'Pill', 'Droplet', 'Thermometer', 'Heart', 'Stethoscope', 'Activity', 'Brain', 'Eye', 'Baby'
]

export default function AddMedication() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [accountType, setAccountType] = useState<string>('')
  
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const [form, setForm] = useState({
    name: '',
    alias: '',
    imageUrl: '',
    patientId: '',
    intervalHours: '',
    marginMinutes: '30',
    startDate: '',
    endDate: '',
    color: SUGGESTED_COLORS[Math.floor(Math.random() * SUGGESTED_COLORS.length)],
    icon: 'Pill'
  })

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/')
        } else {
          setIsAdmin(true)
          fetchPatients()
          fetchAccountInfo()
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

  const handleTemplateSelect = (t: any) => {
    setForm(prev => ({
      ...prev,
      name: t.name,
      intervalHours: t.intervalHours?.toString() || '',
      color: t.color || prev.color,
      icon: t.icon || prev.icon
    }))
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

  const fetchAccountInfo = async () => {
    const res = await fetch('/api/account')
    if (res.ok) {
      const data = await res.json()
      setAccountType(data.account?.type || '')
    }
  }

  const toggleDay = (index: number) => {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter(d => d !== index))
    } else {
      setSelectedDays([...selectedDays, index])
    }
  }

  const setEveryday = () => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6])
  }

  const clearDays = () => setSelectedDays([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const daysOfWeekStr = selectedDays.sort((a,b) => a - b).join(',')

    const payload = {
      ...form,
      marginMinutes: form.marginMinutes ? parseInt(form.marginMinutes, 10) : 30,
      daysOfWeek: daysOfWeekStr,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
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
              <select 
                required 
                className="input-field" 
                value={form.patientId} 
                onChange={e => setForm({...form, patientId: e.target.value})}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Name *</label>
              <input required type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Alias (Optional)</label>
              <input type="text" className="input-field" value={form.alias} onChange={e => setForm({...form, alias: e.target.value})} />
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Color Display</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SUGGESTED_COLORS.map(c => (
                  <div 
                    key={c} 
                    onClick={() => setForm({...form, color: c})}
                    style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      backgroundColor: c, cursor: 'pointer',
                      border: form.color === c ? '2px solid white' : 'none',
                      boxShadow: form.color === c ? '0 0 0 2px var(--accent-primary)' : 'none'
                    }} 
                  />
                ))}
                <input 
                  type="color" 
                  value={form.color} 
                  onChange={e => setForm({...form, color: e.target.value})}
                  style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Icon</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ICON_OPTIONS.map(iconName => {
                  const LucideIcon = (Icons as any)[iconName] || Icons.Pill
                  return (
                    <div 
                      key={iconName}
                      onClick={() => setForm({...form, icon: iconName})}
                      style={{ 
                        padding: '0.25rem', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        background: form.icon === iconName ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: form.icon === iconName ? 'white' : 'inherit'
                      }}
                    >
                      {LucideIcon ? <LucideIcon size={18} /> : <span>📦</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Image URL (Optional)</label>
            <input type="url" className="input-field" placeholder="https://..." value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
          </div>
          
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Interval (Hours) (Optional)</label>
              <input type="number" min="1" className="input-field" value={form.intervalHours} onChange={e => setForm({...form, intervalHours: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Margin (Minutes) *</label>
              <input required type="number" min="0" className="input-field" value={form.marginMinutes} onChange={e => setForm({...form, marginMinutes: e.target.value})} />
            </div>
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label>Days of Week (Optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={setEveryday} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Everyday</button>
                <button type="button" onClick={clearDays} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {DAYS.map((day, ix) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(ix)}
                  className="btn"
                  style={{ 
                    padding: '0.5rem 0.75rem', 
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: selectedDays.includes(ix) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: selectedDays.includes(ix) ? 'white' : 'var(--text-primary)',
                    flex: '1 1 12%'
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Start Date/Time (Optional)</label>
              <input type="datetime-local" className="input-field" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>End Date/Time (Optional)</label>
              <input type="datetime-local" className="input-field" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            {loading ? 'Adding...' : 'Add Medication'}
          </button>
        </form>
      </div>
    </div>
  )
}
