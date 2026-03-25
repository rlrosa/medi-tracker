'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'

export default function ManageMedicationsPage() {
  const router = useRouter()
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check if Admin
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'ADMIN') {
          router.push('/')
        } else {
          // 2. Fetch all medications regardless of schedule
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
    <div className="container">
      <Navigation />
      
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>Manage All Medications</h2>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {med.imageUrl && (
                    <img src={med.imageUrl} alt={med.name} style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover' }} />
                  )}
                  <div style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{med.name} {med.alias ? `(${med.alias})` : ''}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Every {med.intervalHours}h {med.marginMinutes ? `±${med.marginMinutes}m` : ''}
                    </p>
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
    </div>
  )
}
