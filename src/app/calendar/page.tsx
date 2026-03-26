'use client'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'

export default function CalendarView() {
  const router = useRouter()
  const [days, setDays] = useState(3)
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const fetchData = async () => {
    try {
      const hours = days * 24
      const [meRes, upcomingRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/medications/upcoming?hours=${hours}`)
      ])
      
      const meData = await meRes.json()
      if (!meData.user) {
        router.push('/login')
        return
      }
      setUser(meData.user)
      
      if (upcomingRes.ok) {
        const uData = await upcomingRes.json()
        setUpcoming(uData.upcoming || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [days])

  const groupByDay = () => {
    const groups: Record<string, any[]> = {}
    upcoming.forEach(item => {
      const dateStr = new Date(item.nextDue).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      if (!groups[dateStr]) groups[dateStr] = []
      groups[dateStr].push(item)
    })
    return groups
  }

  const dayGroups = groupByDay()

  return (
    <div className="container">
      <Navigation />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
          Medication Timeline
        </h2>
        
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '12px' }}>
          {[3, 5, 7].map(d => (
            <button 
              key={d} 
              onClick={() => setDays(d)}
              className={`btn ${days === d ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem 1rem', borderRadius: '10px', fontSize: '0.8rem', background: days === d ? 'var(--accent-primary)' : 'transparent' }}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading timeline...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days > 3 ? 1 : days}, 1fr)`, gap: '1.5rem' }}>
          {Object.entries(dayGroups).map(([date, items]) => (
            <div key={date} className="glass-panel" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--accent-secondary)' }}>
                {date}
              </h3>
              
              <div className="flex-col" style={{ gap: '0.75rem' }}>
                {items.map((item, idx) => {
                  const due = new Date(item.nextDue)
                  const isNight = due.getHours() < 6 || due.getHours() >= 22
                  
                  return (
                    <div key={item.instanceId} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '0.75rem', 
                      background: isNight ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${item.color || 'var(--accent-primary)'}`
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', minWidth: '60px' }}>
                        {due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.scheduleName} • {item.patient?.name}
                        </div>
                      </div>
                      
                      {isNight && (
                        <div title="Night time dose" style={{ color: '#818cf8' }}>
                          <Icons.Moon size={16} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
