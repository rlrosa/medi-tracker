'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function EditMedication() {
  const router = useRouter()
  const params = useParams()
  const medId = params?.id
  
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const [form, setForm] = useState({
    name: '',
    alias: '',
    imageUrl: '',
    intervalHours: '',
    marginMinutes: '30',
    startDate: '',
    endDate: ''
  })

  // Format a Date object to YYYY-MM-DDThh:mm string for the local input
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
        intervalHours: med.intervalHours ? med.intervalHours.toString() : '',
        marginMinutes: med.marginMinutes ? med.marginMinutes.toString() : '30',
        startDate: med.startDate ? formatForInput(med.startDate) : '',
        endDate: med.endDate ? formatForInput(med.endDate) : ''
      })
      if (med.daysOfWeek) {
        // Expand ranges to individual selected day numbers if needed, 
        // but wait our day picker only created comma separated numbers so far.
        // If it was created as '0-6', expand it:
        let parsed: number[] = []
        med.daysOfWeek.split(',').forEach((p: string) => {
          if (p.includes('-')) {
            const [s, e] = p.split('-').map(Number)
            for (let i = s; i <= e; i++) parsed.push(i)
          } else {
            parsed.push(Number(p))
          }
        })
        setSelectedDays([...new Set(parsed)])
      }
    }
  }

  const toggleDay = (index: number) => {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter(d => d !== index))
    } else {
      setSelectedDays([...selectedDays, index])
    }
  }

  const setEveryday = () => setSelectedDays([0, 1, 2, 3, 4, 5, 6])
  const clearDays = () => setSelectedDays([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Sort days numerically
    const daysOfWeekStr = selectedDays.length > 0 ? selectedDays.sort((a,b) => a - b).join(',') : null

    const payload = {
      ...form,
      marginMinutes: form.marginMinutes ? parseInt(form.marginMinutes, 10) : 30,
      daysOfWeek: daysOfWeekStr,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
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
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Interval (Hours between doses) (Optional)</label>
            <input type="number" min="1" className="input-field" value={form.intervalHours} onChange={e => setForm({...form, intervalHours: e.target.value})} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Margin (Minutes flexibility window) *</label>
            <input required type="number" min="0" className="input-field" value={form.marginMinutes} onChange={e => setForm({...form, marginMinutes: e.target.value})} />
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label>Days of Week (Optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={setEveryday} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)' }}>Everyday</button>
                <button type="button" onClick={clearDays} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)' }}>Clear</button>
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
