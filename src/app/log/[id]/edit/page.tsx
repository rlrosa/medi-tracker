'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

export default function EditLogPage() {
  const router = useRouter()
  const params = useParams()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<any>(null)
  
  const [form, setForm] = useState({
    administeredAt: '',
    notes: ''
  })

  useEffect(() => {
    fetch(`/api/logs/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.log) {
          setLog(data.log)
          // Format date for datetime-local input
          const d = new Date(data.log.administeredAt)
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
          setForm({
            administeredAt: d.toISOString().slice(0, 16),
            notes: data.log.notes || ''
          })
        }
        setLoading(false)
      })
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const payload = {
      ...form,
      administeredAt: new Date(form.administeredAt).toISOString()
    }

    const res = await fetch(`/api/logs/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setSaving(false)
    if (res.ok) {
      router.push('/logs')
      router.refresh()
    } else {
      const { error } = await res.json()
      alert(error || 'Failed to update log')
    }
  }

  return (
    <div className="container">
      <Navigation />
      
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Edit Administration</h2>
          <button onClick={() => router.back()} className="btn" style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', fontSize: '0.9rem' }}>Cancel</button>
        </div>
        
        {loading ? (
          <div>Loading log details...</div>
        ) : !log ? (
          <div style={{ color: 'var(--danger)' }}>Log not found or access denied.</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-col" style={{ gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <div><strong>Medication:</strong> {log.medication.name}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Logged by: {log.administeredByUser.name || log.administeredByUser.username}</div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Administered At *</label>
              <input required type="datetime-local" className="input-field" value={form.administeredAt} onChange={e => setForm({...form, administeredAt: e.target.value})} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Notes (Optional)</label>
              <input type="text" className="input-field" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
