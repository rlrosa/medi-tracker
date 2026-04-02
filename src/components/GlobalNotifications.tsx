'use client'
import { useEffect, useState, useRef } from 'react'
import { useSettings } from './ThemeProvider'
import * as Icons from 'lucide-react'

// Helper to generate a consistent 32-bit positive integer ID for Capacitor notifications
function generateNotificationId(medId: string, nextDue: string): number {
  let hash = 0
  const str = medId + nextDue
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function GlobalNotifications() {
  const { muteAudio } = useSettings()
  const [activeToast, setActiveToast] = useState<string | null>(null)
  const lastNotifiedAt = useRef<Record<string, number>>({})
  const snoozedUntil = useRef<Record<string, number>>({})
  const [user, setUser] = useState<any>(null)
  const lastScheduleHash = useRef<string | null>(null)

  useEffect(() => {
    // Initial user check
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
  }, [])

  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      checkMeds()
    }, 60000) // Every minute

    checkMeds() // Initial check when user is available

    return () => clearInterval(interval)
  }, [user])

  const checkMeds = async () => {
    try {
      const res = await fetch('/api/medications/upcoming?hours=48')
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

      // Sync background notifications for native platforms
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const scheduleHash = JSON.stringify(meds.map((m: any) => m.id + m.nextDue))
        if (scheduleHash !== lastScheduleHash.current) {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          const perm = await LocalNotifications.checkPermissions()
          if (perm.display === 'granted') {
            // Cancel all pending
            const pending = await LocalNotifications.getPending()
            if (pending.notifications.length > 0) {
              await LocalNotifications.cancel({ notifications: pending.notifications })
            }

            const toSchedule = meds
              .filter((med: any) => {
                // Schedule for 10 minutes before due, matching the foreground trigger
                const targetTime = new Date(med.nextDue).getTime() - 10 * 60 * 1000;
                return targetTime > now && !med.isOverdue
              })
              .map((med: any) => {
                const id = generateNotificationId(med.id, med.nextDue)

                return {
                  title: `Medication Reminder: ${med.name}`,
                  body: `It's time for your scheduled dose.`,
                  id: id,
                  schedule: { at: new Date(new Date(med.nextDue).getTime() - 10 * 60 * 1000) },
                  smallIcon: 'ic_launcher_round'
                }
              })

            if (toSchedule.length > 0) {
              await LocalNotifications.schedule({ notifications: toSchedule })
            }
            lastScheduleHash.current = scheduleHash
          }
        }
      }

    } catch (e) {
      console.error('Failed to fetch meds for notifications', e)
    }
  }

  const triggerNotification = async (med: any) => {
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

    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      // Background scheduled notifications handle system-level alerts now.
      // We still schedule an immediate fallback if it was missed, but with a slight delay
      // to avoid conflicting with the exact moment the background one fires if the app is open.
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.checkPermissions()
      if (perm.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: `Medication Reminder: ${med.name}`,
              body: `It's time for your scheduled dose.`,
              id: generateNotificationId(med.id, med.nextDue),
              schedule: { at: new Date(Date.now() + 1000) },
              smallIcon: 'ic_launcher_round'
            }
          ]
        })
      }
    } else {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Medication Reminder: ${med.name}`, {
          body: `It's time for your scheduled dose.`,
          icon: '/logo.png'
        })
      }
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
