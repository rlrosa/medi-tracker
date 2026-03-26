'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPatient, setEditingPatient] = useState<any>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSelfMed, setNewSelfMed] = useState(false)

  const fetchPatients = async () => {
    const res = await fetch('/api/patients')
    if (res.ok) {
      const data = await res.json()
      setPatients(data.patients || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/')
        } else {
          fetchPatients()
        }
      })
  }, [router])

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, selfMedication: newSelfMed })
    })
    if (res.ok) {
      setNewName('')
      setNewSelfMed(false)
      setShowAdd(false)
      fetchPatients()
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete patient ${name}? This will delete all their medications and logs!`)) return
    const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' })
    if (res.ok) fetchPatients()
  }

  return (
    <div className="container">
      <Navigation />
      
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>Manage Patients</h2>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Add Patient</button>
        </div>

        {showAdd && (
          <div className="glass-panel" style={{ marginBottom: '2rem', background: 'var(--bg-secondary)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Add New Patient</h3>
            <form onSubmit={handleAddPatient} className="flex-col" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>Full Name</label>
                <input required type="text" className="input-field" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="selfMed" checked={newSelfMed} onChange={e => setNewSelfMed(e.target.checked)} />
                <label htmlFor="selfMed">Enable Self-Medication (Patient can log their own doses)</label>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Patient</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p>Loading patients...</p>
        ) : patients.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No patients found.</p>
        ) : (
          <div className="grid">
            {patients.map(p => (
              <div key={p.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{p.name}</h3>
                    {p.user?.role === 'ADMIN' && (
                      <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '0.15rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>ADMIN</span>
                    )}
                  </div>
                  {p.user?.email && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', margin: '0.1rem 0' }}>📧 {p.user.email}</p>
                  )}
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {p.selfMedication ? '✅ Self-Medication Enabled' : '👤 Caregiver Managed'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleDelete(p.id, p.name)} className="btn" style={{ color: 'var(--danger)', background: 'transparent' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Link href="/medications" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>← Back to Medications</Link>
      </div>
    </div>
  )
}
