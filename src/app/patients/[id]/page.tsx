'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'

export default function PatientPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params?.id as string

  const [patient, setPatient] = useState<any>(null)
  const [relationships, setRelationships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [newRule, setNewRule] = useState({
    medicationAId: '',
    type: 'NEAR_TO',
    valueHours: '',
    valueMinutes: '',
    medicationBId: ''
  })

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}`)
    if (res.ok) {
      const data = await res.json()
      setPatient(data.patient)
      setRelationships(data.relationships || [])
    } else {
      router.push('/patients')
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
          setIsAdmin(true)
          if (patientId) fetchData()
        }
      })
  }, [patientId, router])

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newRule.medicationAId === newRule.medicationBId) {
      alert("Please select different medications.")
      return
    }

    const totalMinutes = ((parseInt(newRule.valueHours || '0', 10) * 60) + parseInt(newRule.valueMinutes || '0', 10))

    const res = await fetch(`/api/patients/${patientId}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicationAId: newRule.medicationAId,
        type: newRule.type,
        valueMinutes: totalMinutes,
        medicationBId: newRule.medicationBId
      })
    })

    if (res.ok) {
      setNewRule({ ...newRule, valueHours: '', valueMinutes: '', medicationAId: '', medicationBId: '' })
      fetchData()
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to add rule')
    }
  }

  const handleDeleteRule = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    try {
      const res = await fetch(`/api/relationships/${relationshipId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to remove rule')
      }
    } catch (e) {
      console.error('Delete error:', e)
      alert('Network error removing rule')
    }
  }

  if (!isAdmin) return null
  if (loading) return <main className="container"><Navigation /><p>Loading patient data...</p></main>
  if (!patient) return <main className="container"><Navigation /><p>Patient not found.</p></main>

  const getMedName = (id: string) => patient.medications?.find((m: any) => m.id === id)?.name || 'Unknown'

  return (
    <main className="container">
      <Navigation />
      
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>{patient.name}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {patient.selfMedication ? '✅ Self-Medication Enabled' : '👤 Caregiver Managed'}
        </p>
        <Link href="/patients" style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>
          &larr; Back to Patients
        </Link>
      </div>

      <div className="grid">
        {/* Relationships Section */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            Medication Rules & Restrictions
          </h3>
          
          <form onSubmit={handleAddRule} className="glass-panel" style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>+ Add New Rule</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>If taking...</label>
                <select required className="input-field" value={newRule.medicationAId} onChange={e => setNewRule({...newRule, medicationAId: e.target.value})}>
                  <option value="" disabled hidden>Select Medication A</option>
                  {patient.medications.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Rule Type</label>
                <select required className="input-field" value={newRule.type} onChange={e => setNewRule({...newRule, type: e.target.value})}>
                  <option value="NEAR_TO">MUST be taken within (NEAR TO)</option>
                  <option value="FAR_FROM">MUST NOT be taken within (FAR FROM)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Time Window</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" min="0" placeholder="Hours" className="input-field" value={newRule.valueHours} onChange={e => setNewRule({...newRule, valueHours: e.target.value})} />
                  <input type="number" min="0" max="59" placeholder="Minutes" className="input-field" value={newRule.valueMinutes} onChange={e => setNewRule({...newRule, valueMinutes: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Of medication...</label>
                <select required className="input-field" value={newRule.medicationBId} onChange={e => setNewRule({...newRule, medicationBId: e.target.value})}>
                  <option value="" disabled hidden>Select Medication B</option>
                  {patient.medications.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Add Rule</button>
            </div>
          </form>

          <div>
            {relationships.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>No rules defined for this patient.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {relationships.map((rel: any) => {
                  const valH = rel.valueMinutes ? Math.floor(rel.valueMinutes / 60) : 0
                  const valM = rel.valueMinutes ? rel.valueMinutes % 60 : 0
                  let timeStr = ''
                  if (valH > 0) timeStr += `${valH}h `
                  if (valM > 0 || valH === 0) timeStr += `${valM}m`

                  return (
                    <div key={rel.id} className="glass-panel" style={{ padding: '0.75rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9rem' }}>
                        <strong>{getMedName(rel.medicationAId)}</strong>{' '}
                        <span style={{ color: rel.type === 'NEAR_TO' ? 'var(--accent-secondary)' : 'var(--danger)' }}>
                          {rel.type === 'NEAR_TO' ? 'must be within' : 'must be far from'}
                        </span>{' '}
                        <strong>{timeStr}</strong>{' '}
                        of <strong>{getMedName(rel.medicationBId)}</strong>
                      </div>
                      <button onClick={() => handleDeleteRule(rel.id)} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', background: 'transparent' }}>
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Medications List */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            Patient Medications
          </h3>
          {patient.medications?.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No medications assigned.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {patient.medications?.map((m: any) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span>{m.name}</span>
                  <Link href={`/edit/${m.id}`} className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>Edit</Link>
                </div>
              ))}
            </div>
          )}
          <Link href="/add" className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', padding: '0.5rem' }}>
            + Assign Medication
          </Link>
        </div>
      </div>
    </main>
  )
}
