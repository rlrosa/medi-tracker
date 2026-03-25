'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

export default function LogHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [meds, setMeds] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [usersList, setUsersList] = useState<any[]>([])
  
  const [form, setForm] = useState({
    medicationId: '',
    administeredAt: '',
    notes: '',
    administeredByUserId: ''
  })

  useEffect(() => {
    fetch('/api/medications').then(res => res.json()).then(data => setMeds(data.medications || []))
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      setUser(data.user)
      if (data.user?.role === 'ADMIN') {
        fetch('/api/users').then(r => r.json()).then(d => setUsersList(d.users || []))
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Validate
    if (!form.medicationId) {
       alert("Select a medication");
       setLoading(false);
       return;
    }

    const payload = {
      ...form,
      administeredAt: form.administeredAt ? new Date(form.administeredAt).toISOString() : new Date().toISOString()
    }

    const res = await fetch('/api/logs', {
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
      alert(data.error || 'Failed to log administration')
    }
  }

  return (
    <div className="container">
      <Navigation />
      
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Log Custom Administration</h2>
        
        <form onSubmit={handleSubmit} className="flex-col" style={{ gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Medication *</label>
            <select required className="input-field" value={form.medicationId} onChange={e => setForm({...form, medicationId: e.target.value})}>
              <option value="">Select Medication...</option>
              {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Administered At (Leave empty for Now)</label>
            <input type="datetime-local" className="input-field" value={form.administeredAt} onChange={e => setForm({...form, administeredAt: e.target.value})} />
          </div>

          {user?.role === 'ADMIN' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem' }}>Administering User (Admin Override)</label>
              <select className="input-field" value={form.administeredByUserId} onChange={e => setForm({...form, administeredByUserId: e.target.value})}>
                <option value="">{user.name || user.username} (Self)</option>
                {usersList.filter(u => u.id !== user.id).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Notes (Optional)</label>
            <input type="text" className="input-field" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            {loading ? 'Logging...' : 'Log Administration'}
          </button>
        </form>
      </div>
    </div>
  )
}
