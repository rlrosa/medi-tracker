'use client'
import { useEffect, useState, useRef } from 'react'
import { useSettings } from './ThemeProvider'
import * as Icons from 'lucide-react'

export function GlobalNotifications() {
  const { muteAudio } = useSettings()
  const [activeToast, setActiveToast] = useState<string | null>(null)
  const lastNotifiedAt = useRef<Record<string, number>>({})
  const snoozedUntil = useRef<Record<string, number>>({})
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Initial user check
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))

    const interval = setInterval(() => {
      if (!user) return
      checkMeds()
    }, 60000) // Every minute

    checkMeds() // Initial check

    return () => clearInterval(interval)
  }, [user])

  const checkMeds = async () => {
    try {
      const res = await fetch('/api/medications/upcoming?hours=24')
      if (!res.ok) return
      const data = await res.json()
      const meds = data.upcoming || []
      
      const now = Date.now()
      meds.forEach((med: any) => {
        const dueTime = new Date(med.nextDue).getTime()
        // If overdue OR due within 10 minutes
        if (med.isOverdue || (dueTime - now < 10 * 60 * 1000)) {
          const isSnoozed = snoozedUntil.current[med.id] && snoozedUntil.current[med.id] > now
          const hasNotifiedRecently = lastNotifiedAt.current[med.id] && (now - lastNotifiedAt.current[med.id] < 5 * 60 * 1000)
          
          if (!isSnoozed && !hasNotifiedRecently) {
            triggerNotification(med)
            lastNotifiedAt.current[med.id] = now
          }
        }
      })
    } catch (e) {
      console.error('Failed to fetch meds for notifications', e)
    }
  }

  const triggerNotification = (med: any) => {
    setActiveToast(`It is time to take ${med.name}!`)
    setTimeout(() => setActiveToast(null), 8000)

    if (!muteAudio) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch(e) {}
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Medication Reminder: ${med.name}`, {
        body: `It's time for your scheduled dose.`,
        icon: '/logo.png'
      })
    }
  }

  const handleSnooze = (toastText: string) => {
    // Basic snooze for the current UI session
    // This is a bit complex without the med object, but we can just clear the toast
    // The dashbaord has a more specific snooze button. This is just for global visibility.
    setActiveToast(null)
  }

  if (!activeToast) return null

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'max-content',
      maxWidth: '90vw'
    }}>
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
        background: 'var(--accent-primary)',
        color: 'white',
        border: 'none',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
        borderRadius: '50px'
      }}>
        <Icons.Bell className="animate-pulse" size={24} />
        <span style={{ fontWeight: 600 }}>{activeToast}</span>
        <button 
          onClick={() => setActiveToast(null)}
          style={{ 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer',
            padding: '0.2rem',
            borderRadius: '50%',
            display: 'flex'
          }}
        >
          <Icons.X size={18} />
        </button>
      </div>
    </div>
  )
}
