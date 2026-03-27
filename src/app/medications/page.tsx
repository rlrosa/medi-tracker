'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import * as Icons from 'lucide-react'

export default function ManageMedicationsPage() {
  const router = useRouter()
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/')
        } else {
          fetch('/api/medications')
            .then(res => res.json())
            .then(medData => {
              setMedications(medData.medications || [])
              setLoading(false)
            })
        }
      })
  }, [router])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to completely delete ${name}? All associated administration logs will also be permanently lost!`)) {
      return
    }
    
    const res = await fetch(`/api/medications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMedications(medications.filter(m => m.id !== id))
    } else {
      alert('Failed to delete medication.')
    }
  }

  return (
    <main className="container">
      <Navigation />
      
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>Manage All Medications</h2>
            <Link href="/patients" style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', textDecoration: 'none' }}>→ Manage Patients</Link>
          </div>
          <Link href="/add" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            + Add New
          </Link>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading medications...</div>
        ) : medications.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No medications found in the database.</p>
        ) : (
          <div className="grid">
            {medications.map(med => (
              <div key={med.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: med.color || 'var(--accent-primary)', borderRadius: '12px', color: 'white' }}>
                    {med.imageUrl ? (
                      <img src={med.imageUrl} alt={med.name} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                    ) : (
                      (() => {
                        const LucideIcon = (Icons as any)[med.icon || 'Pill'] || Icons.Pill
                        return <LucideIcon size={24} />
                      })()
                    )}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{med.name} {med.alias ? `(${med.alias})` : ''}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      <span>👤 {med.patient?.name || 'No Patient'}</span>
                      <span>🕒 Every {med.intervalHours || 'N/A'}h</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Link href={`/edit/${med.id}`} className="btn" style={{ flexGrow: 1, backgroundColor: 'var(--accent-primary)', color: 'white', textDecoration: 'none', padding: '0.5rem' }}>
                    Edit rules
                  </Link>
                  <button onClick={() => handleDelete(med.id, med.name)} className="btn" style={{ flexGrow: 1, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
