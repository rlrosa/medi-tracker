'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

export default function AddMedication() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    alias: '',
    imageUrl: '',
    intervalHours: '',
    daysOfWeek: '',
    startDate: '',
    endDate: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Add time component to dates if they exist
    const payload = {
      ...form,
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

  return (
    <div className="container">
      <Navigation />
      
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Add New Medication</h2>
        
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
          
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Interval (Hours between doses)</label>
              <input type="number" min="1" className="input-field" value={form.intervalHours} onChange={e => setForm({...form, intervalHours: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Days of Week (0-6, comma separated)</label>
              <input type="text" placeholder="e.g. 1,3,5 for Mon/Wed/Fri" className="input-field" value={form.daysOfWeek} onChange={e => setForm({...form, daysOfWeek: e.target.value})} />
            </div>
          </div>
          
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Start Date/Time</label>
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
