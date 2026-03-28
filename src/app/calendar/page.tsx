'use client'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { ConflictModal, ConflictData } from '@/components/ConflictModal'

export default function CalendarView() {
  const router = useRouter()
  const [days, setDays] = useState(3)
  const [viewDate, setViewDate] = useState(new Date())
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<any>(null)
  const [previewTime, setPreviewTime] = useState<Date | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [movementData, setMovementData] = useState<any>(null)
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null)
  const [guidelineY, setGuidelineY] = useState<number | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [administeringMed, setAdministeringMed] = useState<any>(null)
  const [administerNotes, setAdministerNotes] = useState('')
  const [adminTimeStr, setAdminTimeStr] = useState('')
  const [editedTime, setEditedTime] = useState('')
  const [administerLoading, setAdministerLoading] = useState(false)
  const [accountUsers, setAccountUsers] = useState<any[]>([])
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('')

  // Sticky Preferences & Deletion
  const [movePreference, setMovePreference] = useState<'ASK' | 'SINGLE' | 'OFFSET'>('ASK')
  const [showPulse, setShowPulse] = useState(false)
  const [rememberMove, setRememberMove] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState<any>(null)
  const [conflictData, setConflictData] = useState<any>(null)
  const [isOverride, setIsOverride] = useState(false)
  const [violationDetail, setViolationDetail] = useState<{title: string, message: string} | null>(null)

  const showViolationDetails = (med: any) => {
    const type = med.warningType || med.log?.warningType || ((med.isOverride || med.log?.isOverride) ? 'OVERRIDE' : 'UNKNOWN');
    let msg = "This schedule event deviated from typical parameters.";
    if (type === 'INTERVAL') msg = "This dose violates the minimum required time interval between administrations.";
    if (type === 'OFFSET_VIOLATION' || type === 'OVERRIDE') msg = "This dose was manually offset from its optimal schedule, deviating from the baseline rhythm.";
    if (type === 'RELATIONSHIP') msg = "This dose conflicts with a defined medication relationship rule.";
    
    setViolationDetail({ title: "Schedule Violation", message: msg });
  }

  // Reset override if the user changes the medication or time
  useEffect(() => {
    setIsOverride(false)
  }, [administeringMed?.id, adminTimeStr])

  // Undo State
  const [lastActionDescription, setLastActionDescription] = useState<string | null>(null)
  const [lastRedoDescription, setLastRedoDescription] = useState<string | null>(null)
  const [showUndoToast, setShowUndoToast] = useState(false)
  const [isUndoPinned, setIsUndoPinned] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)

  const fetchData = async () => {
    try {
      const hours = days * 24
      const start = new Date(viewDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + days)
      
      const [meRes, upcomingRes, logsRes, usersRes, historyRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/medications/upcoming?hours=${hours}&startDate=${start.toISOString()}`),
        fetch(`/api/logs?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        fetch('/api/users'),
        fetch('/api/events/history')
      ])
      
      const meData = await meRes.json()
      if (!meData.user) {
        router.push('/login')
        return
      }

      const historyData = await historyRes.json()
      setUndoCount(historyData.undoCount || 0)
      setRedoCount(historyData.redoCount || 0)
      if (historyData.undoCount > 0 && !lastActionDescription) {
        setLastActionDescription(historyData.lastUndoDescription)
      }
      if (historyData.redoCount > 0) {
        setLastRedoDescription(historyData.lastRedoDescription)
      }
      setUser(meData.user)
      if (meData.user.defaultMovePreference) {
        setMovePreference(meData.user.defaultMovePreference)
      }
      setSelectedCaregiverId(meData.user.id)
      
      if (usersRes.ok) {
        const uData = await usersRes.json()
        setAccountUsers(uData.users || [])
      }
      
      if (upcomingRes.ok) {
        const uData = await upcomingRes.json()
        setUpcoming(uData.upcoming || [])
      }

      if (logsRes.ok) {
        const lData = await logsRes.json()
        setLogs(lData.logs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (administeringMed && !adminTimeStr) {
      const pad = (n: number) => n.toString().padStart(2, '0')
      let d = new Date()
      if (administeringMed.status === 'SKIPPED') {
        const scheduledTimeStr = administeringMed.scheduledAt || administeringMed.displayTime || administeringMed.nextDue || administeringMed.time || administeringMed.originalTime
        if (scheduledTimeStr) {
          d = new Date(scheduledTimeStr)
        }
      }
      setAdminTimeStr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
  }, [administeringMed])


  useEffect(() => {
    setIsMounted(true)
    fetchData()
  }, [days, viewDate])

  useEffect(() => {
    let timer: any
    if (showUndoToast && !isUndoPinned) {
      timer = setTimeout(() => {
        setShowUndoToast(false)
      }, 18000) // 18 seconds (3x from 6s)
    }
    return () => clearTimeout(timer)
  }, [showUndoToast, isUndoPinned, undoCount, redoCount])

  useEffect(() => {
    const handleReopen = () => {
      if (lastActionDescription) {
        setShowUndoToast(true)
        setIsUndoPinned(true)
      }
    }
    window.addEventListener('reopenUndoToast', handleReopen)
    return () => window.removeEventListener('reopenUndoToast', handleReopen)
  }, [lastActionDescription])

  const persistMovePreference = async (mode: 'ASK' | 'SINGLE' | 'OFFSET') => {
    try {
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultMovePreference: mode })
      })
    } catch (err) {
      console.error('Failed to persist move preference', err)
    }
  }

  const handleSync = async () => {
    // ... existed logic
  }

  const handleMoveEvent = async (mode: 'SINGLE' | 'OFFSET', currentMovement?: any) => {
    const data = currentMovement || movementData
    if (!data) return
    setIsUpdating(true)
    try {
      if (mode === 'SINGLE') {
        const res = await fetch(`/api/events/${data.eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            time: data.newTime.toISOString(),
            isOverride: currentMovement?.isOverride
          })
        })
        if (res.status === 409) {
          const conflict = await res.json()
          setConflictData({ ...conflict, action: 'MOVE', data })
          setIsUpdating(false)
          setShowMoveModal(false)
          return
        }
        if (!res.ok) throw new Error('Failed to update event')
      } else if (mode === 'OFFSET') {
        const deltaMinutes = Math.round((data.newTime.getTime() - new Date(data.originalTime).getTime()) / 60000)
        const res = await fetch('/api/events/offset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scheduleId: data.scheduleId,
            fromEventId: data.eventId,
            deltaMinutes,
            isOverride: currentMovement?.isOverride
          })
        })
        if (res.status === 409) {
          const conflict = await res.json()
          setConflictData({ ...conflict, action: 'OFFSET', data })
          setIsUpdating(false)
          setShowMoveModal(false)
          return
        }
        if (!res.ok) throw new Error('Failed to offset events')
      }
      
      if (rememberMove) {
        setMovePreference(mode)
        setShowPulse(true)
        setTimeout(() => setShowPulse(false), 2000)
        
        // Persist to DB
        persistMovePreference(mode)
      } else if (movePreference === 'ASK') {
        // Just update local header state even if not "remembered" for persistence
        // to make it "sticky" for the current session
        setMovePreference(mode)
      }

      setShowMoveModal(false)
      setMovementData(null)
      setRememberMove(false)
      
      setLastActionDescription(`Moved ${data.name || 'dose'}`)
      setUndoCount(prev => Math.min(prev + 1, 10))
      setRedoCount(0) // New action clears redo stack
      setShowUndoToast(true)
      setIsUndoPinned(false) // Reset pin on new action

      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (mode: 'SINGLE' | 'BULK') => {
    if (!deletingEvent) return
    setIsUpdating(true)
    try {
      if (mode === 'SINGLE') {
        const res = await fetch(`/api/events/${deletingEvent.instanceId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete event')
      } else {
        const res = await fetch('/api/events/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scheduleId: deletingEvent.scheduleId,
            fromTime: deletingEvent.displayTime.toISOString()
          })
        })
        if (!res.ok) throw new Error('Failed to delete future events')
      }
      setShowDeleteModal(false)
      setDeletingEvent(null)
      setSelectedEntry(null)
      
      setLastActionDescription(`Deleted dose of ${deletingEvent.name}`)
      setUndoCount(prev => Math.min(prev + 1, 10))
      setRedoCount(0) // New action clears redo stack
      setShowUndoToast(true)
      setIsUndoPinned(false)

      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUndo = async () => {
    setIsUndoing(true)
    try {
      const res = await fetch('/api/events/undo', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Undo failed')
      }
      
      setUndoCount(data.undoCount || 0)
      setRedoCount(data.redoCount || 0)
      setLastActionDescription(data.lastUndoDescription || null)
      setLastRedoDescription(data.lastRedoDescription || null)
      
      if (data.undoCount === 0 && data.redoCount === 0) {
        setShowUndoToast(false)
      } else {
        setShowUndoToast(true)
      }
      
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUndoing(false)
    }
  }

  const handleRedo = async () => {
    setIsUndoing(true)
    try {
      const res = await fetch('/api/events/redo', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Redo failed')
      }
      
      setUndoCount(data.undoCount || 0)
      setRedoCount(data.redoCount || 0)
      setLastActionDescription(data.lastUndoDescription || null)
      setLastRedoDescription(data.lastRedoDescription || null)
      
      if (data.undoCount === 0 && data.redoCount === 0) {
        setShowUndoToast(false)
      } else {
        setShowUndoToast(true)
      }
      
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUndoing(false)
    }
  }

  const onDragStart = (e: React.DragEvent, item: any) => {
    if (item.type !== 'UPCOMING') return
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    
    // Transparent drag image to hide the default ghost
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)
  }

  const onDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    if (!draggedItem) return

    const inner = (e.currentTarget as HTMLElement).querySelector('.timeline-inner')
    const rect = inner ? inner.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const hourPercent = y / rect.height
    const totalMinutes = hourPercent * 1440
    
    // Snap to 15m
    const snappedMinutes = Math.round(totalMinutes / 15) * 15
    
    const newTime = new Date(date)
    newTime.setHours(Math.floor(snappedMinutes / 60))
    newTime.setMinutes(Math.floor(snappedMinutes % 60))
    newTime.setSeconds(0)
    newTime.setMilliseconds(0)

    const newMovement = {
      eventId: draggedItem.instanceId,
      newTime,
      originalTime: draggedItem.nextDue,
      scheduleId: draggedItem.scheduleId,
      name: draggedItem.name
    }

    if (movePreference !== 'ASK') {
      handleMoveEvent(movePreference, newMovement)
    } else {
      setMovementData(newMovement)
      setShowMoveModal(true)
    }
    setDraggedItem(null)
    setPreviewTime(null)
    setHoveredDay(null)
    setGuidelineY(null)
  }

  const onDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    if (!draggedItem) return

    setMousePos({ x: e.clientX, y: e.clientY })

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const inner = (e.currentTarget as HTMLElement).querySelector('.timeline-inner')
    const innerRect = inner ? inner.getBoundingClientRect() : rect
    
    // y should be relative to the inner timeline container for correct snapping and guideline placement
    const y = e.clientY - innerRect.top
    const hourPercent = y / innerRect.height
    const totalMinutes = hourPercent * 1440
    
    // Snap to 15m
    const snappedMinutes = Math.round(totalMinutes / 15) * 15
    
    const newTime = new Date(date)
    newTime.setHours(Math.floor(snappedMinutes / 60))
    newTime.setMinutes(Math.floor(snappedMinutes % 60))
    newTime.setSeconds(0)
    newTime.setMilliseconds(0)
    
    if (!previewTime || previewTime.getTime() !== newTime.getTime()) {
      setPreviewTime(newTime)
    }
    setHoveredDay(date)
    setGuidelineY(y)
  }

  const handleAdminister = async () => {
    if (!user || !administeringMed) return
    setAdministerLoading(true)
    try {
      const payload: any = {
        medicationId: administeringMed.id,
        administeredAt: adminTimeStr ? new Date(adminTimeStr).toISOString() : new Date().toISOString(),
        administeredByUserId: selectedCaregiverId
      };
      if (administeringMed.nextDue) payload.scheduledAt = administeringMed.nextDue;
      if (administerNotes) payload.notes = administerNotes;
      
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          scheduleId: administeringMed.scheduleId,
          eventId: administeringMed.instanceId || administeringMed.eventId || administeringMed.log?.eventId || null,
          status: administeringMed.status || 'ADMINISTERED',
          isOverride: isOverride
        })
      })
      if (res.status === 409) {
        const conflict = await res.json()
        setConflictData({ ...conflict, action: 'ADMINISTER', data: administeringMed })
        setAdministerLoading(false)
        return
      }
      if (res.ok) {
        setAdministeringMed(null)
        setSelectedEntry(null)
        setAdministerNotes('')
        setAdminTimeStr('')
        setIsOverride(false)
        fetchData()
      } else {
        alert('Failed to administer medication.');
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred.');
    } finally {
      setAdministerLoading(false)
    }
  }

  const nextRange = () => {
    const next = new Date(viewDate)
    next.setDate(next.getDate() + days)
    setViewDate(next)
  }

  const prevRange = () => {
    const prev = new Date(viewDate)
    prev.setDate(prev.getDate() - days)
    setViewDate(prev)
  }

  const resetToToday = () => {
    setViewDate(new Date())
  }

  const getDaysArray = () => {
    const arr = []
    const start = new Date(viewDate)
    start.setHours(0,0,0,0)
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      arr.push(d)
    }
    return arr
  }

  const dayDates = getDaysArray()

  return (
    <main className="container" style={{ maxWidth: '1400px' }}>
      <Navigation />
      
      <div className="flex-col" style={{ gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Medication Timeline</h2>
            <p style={{ color: 'var(--text-secondary)' }} suppressHydrationWarning>
              {isMounted ? dayDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'} 
              {' - '} 
              {isMounted ? dayDates[dayDates.length-1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Move Preference Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Move Type:</span>
              <div 
                className={showPulse ? 'pulse-aura' : ''}
                style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
              >
                {[
                  { id: 'ASK', icon: Icons.MessageSquare, label: 'Ask' },
                  { id: 'SINGLE', icon: Icons.MousePointer2, label: 'Single' },
                  { id: 'OFFSET', icon: Icons.MoveRight, label: 'Offset' }
                ].map(pref => {
                  const Icon = pref.icon
                  return (
                    <button
                      key={pref.id}
                      onClick={() => { setMovePreference(pref.id as any); persistMovePreference(pref.id as any); }}
                      className="btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: movePreference === pref.id ? 'var(--accent-primary)' : 'transparent',
                        color: movePreference === pref.id ? 'white' : 'var(--text-secondary)',
                        borderRadius: '10px',
                        border: 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={14} />
                      {pref.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <button onClick={prevRange} className="btn" style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)' }} title="Previous Range">
                <Icons.ChevronLeft size={20} />
              </button>
              <button 
                onClick={resetToToday} 
                className="btn" 
                style={{ 
                  fontSize: '0.8rem', 
                  padding: '0.4rem 0.8rem', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}
              >
                Today
              </button>
              <button onClick={nextRange} className="btn" style={{ padding: '0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)' }} title="Next Range">
                <Icons.ChevronRight size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '12px' }}>
              {[3, 5, 7].map(d => (
                <button 
                  key={d} 
                  onClick={() => { setDays(d); setViewDate(new Date()); }} 
                  className={`btn ${days === d ? 'btn-primary' : ''}`}
                  style={{ padding: '0.4rem 1rem', borderRadius: '10px', fontSize: '0.8rem', background: days === d ? 'var(--accent-primary)' : 'transparent', color: days === d ? 'white' : 'inherit' }}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '10rem' }}>Loading timeline...</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${days}, 1fr)`, 
            gap: '1px',
            background: 'var(--glass-border)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            minHeight: '800px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            {dayDates.map((date, idx) => {
              const now = new Date()
              const dayStart = new Date(date)
              dayStart.setHours(0, 0, 0, 0)
              const dayEnd = new Date(date)
              dayEnd.setHours(23, 59, 59, 999)

              const dayMedsFiltered = upcoming.filter(m => {
                const medDate = new Date(m.nextDue)
                return medDate >= dayStart && medDate <= dayEnd
              })

              const dayLogs = logs.filter(l => {
                const d = new Date(l.administeredAt)
                return d >= dayStart && d <= dayEnd
              })

              const matchedLogIds = new Set()
              const finalEntries: any[] = []

              // 1. Process Scheduled Meds
              dayMedsFiltered.forEach(med => {
                const scheduledTime = new Date(med.nextDue)
                const isPast = scheduledTime < now
                
                // Find closest log match within 3 hours, respecting scheduleId and boundary
                const matches = dayLogs
                  .filter(l => {
                    if (l.medicationId !== med.id || matchedLogIds.has(l.id)) return false
                    // Must match scheduleId OR be a manual log (null) that happened after schedule start
                    const scheduleMatch = l.scheduleId === med.scheduleId || (l.scheduleId === null && new Date(l.administeredAt) >= new Date(med.scheduleStartDate))
                    return scheduleMatch
                  })
                  .sort((a, b) => {
                    const aDiff = Math.abs(new Date(a.administeredAt).getTime() - scheduledTime.getTime())
                    const bDiff = Math.abs(new Date(b.administeredAt).getTime() - scheduledTime.getTime())
                    return aDiff - bDiff
                  })
                
                const bestMatch = matches[0]
                const diff = bestMatch ? Math.abs(new Date(bestMatch.administeredAt).getTime() - scheduledTime.getTime()) : Infinity
                
                if (bestMatch && diff < 3 * 60 * 60 * 1000) {
                  matchedLogIds.add(bestMatch.id)
                  finalEntries.push({
                    ...med,
                    type: 'LOGGED',
                    log: bestMatch,
                    displayTime: new Date(bestMatch.administeredAt),
                    scheduledAt: scheduledTime
                  })
                } else if (isPast) {
                  finalEntries.push({
                    ...med,
                    type: 'MISSED',
                    displayTime: scheduledTime
                  })
                } else {
                  const windowStart = new Date(scheduledTime.getTime() - (med.marginMinutes || 30) * 60000)
                  const windowEnd = new Date(scheduledTime.getTime() + (med.marginMinutes || 30) * 60000)
                  const isInWindow = now >= windowStart && now <= windowEnd
                  finalEntries.push({
                    ...med,
                    type: 'UPCOMING',
                    displayTime: scheduledTime,
                    isInWindow
                  })
                }
              })

              // 2. Add Unmatched Logs
              dayLogs.forEach(l => {
                if (!matchedLogIds.has(l.id)) {
                  finalEntries.push({
                    id: l.medicationId,
                    name: l.medication.name,
                    alias: l.medication.alias,
                    color: l.medication.color || '#6366f1',
                    icon: l.medication.icon || 'Pill',
                    type: 'LOGGED',
                    log: l,
                    displayTime: new Date(l.administeredAt)
                  })
                }
              })

              // Sort for rendering
              const sorted = finalEntries.sort((a,b) => a.displayTime.getTime() - b.displayTime.getTime())
              
              const activeGroups: any[][] = []
              sorted.forEach(med => {
                const medTime = med.displayTime.getTime()
                let foundGroup = activeGroups.find(g => {
                   const lastEnd = Math.max(...g.map(m => m.displayTime.getTime() + 45 * 60 * 1000))
                   return medTime < lastEnd
                })
                if (!foundGroup) {
                  foundGroup = []
                  activeGroups.push(foundGroup)
                }
                foundGroup.push(med)
              })

              return (
                <div 
                  key={idx} 
                  style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', position: 'relative', minWidth: '0' }}
                  onDragOver={e => onDragOver(e, date)}
                  onDrop={e => onDrop(e, date)}
                  onDragLeave={() => setHoveredDay(null)}
                >
                  <div style={{ 
                    padding: '1rem', 
                    textAlign: 'center', 
                    borderBottom: '1px solid var(--glass-border)',
                    background: 'var(--bg-secondary)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                  </div>
                  
                  <div className="timeline-inner" style={{ position: 'relative', height: '2880px', background: 'rgba(255,255,255,0.02)', width: '100%' }}>
                    {/* Hour Markers */}
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} style={{ 
                        position: 'absolute', 
                        top: `${(hour / 24) * 100}%`, 
                        left: 0, right: 0, 
                        borderTop: '1px solid var(--glass-border)',
                        opacity: hour % 4 === 0 ? 0.3 : 0.1,
                        pointerEvents: 'none',
                        height: '1px'
                      }}>
                        {hour % 2 === 0 && (
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginLeft: '4px', background: 'var(--bg-primary)', padding: '0 2px' }}>
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Current Time Indicator */}
                    {now.toDateString() === date.toDateString() && (
                      <div style={{
                        position: 'absolute',
                        top: `${((now.getHours() * 60 + now.getMinutes()) / 1440) * 100}%`,
                        left: 0, right: 0,
                        borderTop: '2px dashed var(--success)',
                        zIndex: 50,
                        pointerEvents: 'none',
                        opacity: 0.8
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '-4px',
                          top: '-4px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--success)',
                          boxShadow: '0 0 8px var(--success)'
                        }}></div>
                      </div>
                    )}

                    {/* Meds */}
                    {sorted.map((item, mIdx) => {
                      const minutes = item.displayTime.getHours() * 60 + item.displayTime.getMinutes()
                      const top = (minutes / 1440) * 100
                      
                      const group = activeGroups.find(g => g.includes(item)) || [item]
                      const colIdx = group.indexOf(item)
                      const totalCols = group.length
                      
                      const LucideIcon = (Icons as any)[item.icon || 'Pill'] || Icons.Pill
                      const isNight = item.displayTime.getHours() >= 20 || item.displayTime.getHours() < 6

                      const isBeingDragged = draggedItem?.instanceId === item.instanceId
                      let borderStyle = `3px solid ${item.color || 'var(--accent-primary)'}`
                      let opacity = 1
                      let background = isNight ? 'rgba(99, 102, 241, 0.15)' : 'var(--glass-bg)'

                      if (item.type === 'LOGGED') {
                        background = item.log.status === 'SKIPPED' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.08)'
                        opacity = 0.9
                      } else if (item.type === 'MISSED') {
                        borderStyle = `3px solid #ef4444`
                        opacity = 0.7
                      } else if (item.type === 'UPCOMING' && item.isInWindow) {
                        background = 'rgba(255, 255, 255, 0.1)'
                      }

                      if (isBeingDragged) {
                        opacity = 0.4
                      }

                      return (
                        <div 
                          key={item.instanceId || item.log?.id || mIdx}
                          onClick={() => {
                            setSelectedEntry(item);
                            setEditedTime(item.displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                          }}
                          draggable={item.type === 'UPCOMING'}
                          onDragStart={e => onDragStart(e, item)}
                          className={`glass-panel ${item.type === 'UPCOMING' ? 'draggable-event' : ''}`}
                          style={{
                            position: 'absolute',
                            top: `${top}%`,
                            left: `${(colIdx / totalCols) * 100}%`,
                            width: `${(1 / totalCols) * 100}%`,
                            padding: '0.4rem',
                            fontSize: '0.7rem',
                            borderLeft: borderStyle,
                            borderLeftWidth: '4px',
                            borderRadius: '8px',
                            background,
                            opacity,
                            zIndex: isBeingDragged || (item.type === 'UPCOMING' && item.isInWindow) ? 100 : 5,
                            minHeight: '48px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: item.type === 'UPCOMING' && item.isInWindow ? `0 0 15px ${item.color}44` : '0 4px 10px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', flex: 1 }}>
                              <LucideIcon size={12} style={{ color: item.color || 'var(--accent-primary)' }} />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {item.name}
                                {item.type === 'MISSED' && <span style={{ color: '#ef4444', marginLeft: '4px' }}>(Missed)</span>}
                                {item.type === 'LOGGED' && item.log.status === 'SKIPPED' && <span style={{ color: 'var(--accent-primary)', marginLeft: '4px' }}>(Skipped)</span>}
                                {(item.warningType || item.isOverride || item.log?.warningType || item.log?.isOverride) && (
                                  <div onClick={(e) => { e.stopPropagation(); showViolationDetails(item); }} title="Click for violation details" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                                    <Icons.AlertTriangle 
                                      size={12} 
                                      style={{ color: '#f59e0b', marginLeft: '4px' }} 
                                      className="warning-pulse"
                                    />
                                  </div>
                                )}
                              </span>
                            </div>
                            
                            {isBeingDragged && previewTime && (
                              <div className="time-badge">
                                {previewTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}

                            {!isBeingDragged && totalCols === 1 && item.type === 'UPCOMING' && (
                              <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                 <button 
                                   onClick={() => { setAdministeringMed({...item, status: 'ADMINISTERED'}); setAdministerNotes(''); }} 
                                   style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--success)', opacity: 0.8 }}
                                   title="Administer"
                                 >
                                   <Icons.Check size={12} strokeWidth={3} />
                                 </button>
                                 <button 
                                   onClick={() => { setAdministeringMed({...item, status: 'SKIPPED'}); setAdministerNotes('Skipped dose'); }} 
                                   style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--accent-primary)', opacity: 0.8 }}
                                   title="Skip"
                                 >
                                   <Icons.SkipForward size={12} />
                                 </button>
                              </div>
                            )}
                            {item.type === 'LOGGED' && <Icons.CheckCircle2 size={12} style={{ color: item.log.status === 'SKIPPED' ? 'var(--accent-primary)' : 'var(--success)' }} />}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ opacity: 0.8 }}>
                              {item.displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isNight && <Icons.Moon size={10} style={{ opacity: 0.6 }} />}
                          </div>
                        </div>
                      )
                    })}
                    {/* Drag Guideline */}
                    {previewTime && hoveredDay?.getTime() === date.getTime() && guidelineY !== null && (
                      <div style={{
                        position: 'absolute',
                        top: `${guidelineY}px`,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'var(--accent-primary)',
                        opacity: 0.8,
                        boxShadow: '0 0 15px var(--accent-primary)',
                        zIndex: 50,
                        pointerEvents: 'none'
                      }}>
                        <div style={{
                          position: 'absolute',
                          right: '8px',
                          top: '-20px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                          {previewTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1.5rem', marginTop: '2rem' }}>
          <p>Each column represents one full day. Medications are positioned vertically by time of day.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
             <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' }}>← Return to Dashboard</Link>
             <Link href="/add" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' }}>+ Add Medication</Link>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {selectedEntry && !administeringMed && (
        <div 
          onClick={() => setSelectedEntry(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="glass-panel" 
            style={{ width: '100%', maxWidth: '450px', boxShadow: '0 20px 80px rgba(0,0,0,0.8)', padding: '2rem' }}
          >
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div style={{ width: '90px', height: '90px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedEntry.color || 'var(--accent-primary)', borderRadius: '22px', color: 'white', boxShadow: `0 10px 20px ${(selectedEntry.color || '#6366f1')}44` }}>
                {(() => {
                  const LucideIcon = (Icons as any)[selectedEntry.icon || 'Pill'] || Icons.Pill
                  return <LucideIcon size={44} />
                })()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: '700' }}>
                  <Link href={`/medications/${selectedEntry.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {selectedEntry.name} ↗
                  </Link>
                </h3>
                {selectedEntry.alias && <p style={{ color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>{selectedEntry.alias}</p>}
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icons.Clock size={14} /> {selectedEntry.displayTime?.toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' }) || new Date(selectedEntry.nextDue).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icons.Calendar size={14} /> {selectedEntry.scheduleName || 'Manual Log'}</p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icons.User size={14} /> {selectedEntry.patient?.name || 'Unknown'}</p>
                  {selectedEntry.log && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <p style={{ fontWeight: '600', color: selectedEntry.log.status === 'SKIPPED' ? 'var(--accent-primary)' : 'var(--success)' }}>
                        {selectedEntry.log.status === 'SKIPPED' ? 'Skipped' : 'Administered'} at {new Date(selectedEntry.log.administeredAt).toLocaleTimeString()}
                      </p>
                      {selectedEntry.log.administeredByUser && <p>By: {selectedEntry.log.administeredByUser.name || selectedEntry.log.administeredByUser.email}</p>}
                      {selectedEntry.log.notes && <p style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>"{selectedEntry.log.notes}"</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-col" style={{ gap: '0.75rem' }}>
              {selectedEntry.type === 'UPCOMING' && (
                <>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>Adjust Time</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="time" 
                          value={editedTime}
                          onChange={e => setEditedTime(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const [h, m] = editedTime.split(':').map(Number);
                              const newTime = new Date(selectedEntry.displayTime || selectedEntry.nextDue);
                              newTime.setHours(h, m, 0, 0);
                              
                              const newMovement = {
                                eventId: selectedEntry.instanceId,
                                newTime,
                                originalTime: selectedEntry.nextDue,
                                scheduleId: selectedEntry.scheduleId,
                                name: selectedEntry.name
                              };

                              if (movePreference !== 'ASK') {
                                handleMoveEvent(movePreference, newMovement);
                              } else {
                                setMovementData(newMovement);
                                setShowMoveModal(true);
                              }
                              setSelectedEntry(null);
                            }
                          }}
                          className="input-field"
                          style={{ flex: 1, padding: '0.5rem' }}
                        />
                        <button 
                          className="btn glass-panel" 
                          style={{ padding: '0 1rem', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                          onClick={() => {
                            const [h, m] = editedTime.split(':').map(Number);
                            const newTime = new Date(selectedEntry.displayTime || selectedEntry.nextDue);
                            newTime.setHours(h, m, 0, 0);
                            
                            const newMovement = {
                              eventId: selectedEntry.instanceId,
                              newTime,
                              originalTime: selectedEntry.nextDue,
                              scheduleId: selectedEntry.scheduleId,
                              name: selectedEntry.name
                            };

                            if (movePreference !== 'ASK') {
                              handleMoveEvent(movePreference, newMovement);
                            } else {
                              setMovementData(newMovement);
                              setShowMoveModal(true);
                            }
                            setSelectedEntry(null);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.75rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ height: '54px', fontSize: '1.1rem', background: 'var(--success)', color: 'white', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      onClick={() => { setAdministeringMed({...selectedEntry, status: 'ADMINISTERED'}); setAdministerNotes(''); }}
                    >
                      <Icons.CheckCircle size={20} /> Administer
                    </button>
                    <button 
                      className="btn" 
                      style={{ height: '54px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => { setDeletingEvent(selectedEntry); setShowDeleteModal(true); }}
                      title="Delete Dose"
                    >
                      <Icons.Trash2 size={20} />
                    </button>
                  </div>
                </>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: selectedEntry.type === 'UPCOMING' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                {selectedEntry.type === 'UPCOMING' && (
                  <button 
                    className="btn" 
                    style={{ height: '54px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', width: '100%' }}
                    onClick={() => { setAdministeringMed({...selectedEntry, status: 'SKIPPED'}); setAdministerNotes('Skipped dose'); }}
                  >
                    ⏭️ Skip Dose
                  </button>
                )}
                <button 
                  className="btn" 
                  style={{ height: '54px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', width: '100%' }}
                  onClick={() => router.push(`/edit/${selectedEntry.id}`)}
                >
                  ⚙️ {selectedEntry.type === 'LOGGED' ? 'View/Edit Rules' : 'Edit Rules'}
                </button>
              </div>
              
              <button 
                className="btn" 
                style={{ marginTop: '1rem', background: 'transparent', width: '100%', color: 'var(--text-secondary)' }}
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Choice Modal */}
      {showDeleteModal && deletingEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 20002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', marginBottom: '1rem' }}>
              <Icons.AlertTriangle size={24} />
              <h2 style={{ fontSize: '1.4rem' }}>Delete Scheduled Dose</h2>
            </div>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              How would you like to remove this dose of <strong>{deletingEvent.name}</strong>?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                onClick={() => handleDelete('SINGLE')}
                className="btn glass-panel" 
                style={{ textAlign: 'left', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}
                disabled={isUpdating}
              >
                <div style={{ fontWeight: 'bold' }}>Delete ONLY this instance</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Removes just this specific dose from the schedule.</div>
              </button>
              
              <button 
                onClick={() => handleDelete('BULK')}
                className="btn glass-panel" 
                style={{ textAlign: 'left', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)', transition: 'all 0.2s' }}
                disabled={isUpdating}
              >
                <div style={{ fontWeight: 'bold', color: '#ef4444' }}>Delete this and ALL following instances</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Effectively ends this medication schedule from this point forward.</div>
              </button>
              
              <button 
                onClick={() => { setShowDeleteModal(false); setDeletingEvent(null); }}
                className="btn" 
                style={{ marginTop: '1rem', opacity: 0.6 }}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
            {isUpdating && <div style={{ marginTop: '1rem', textAlign: 'center', color: '#ef4444' }}>Deleting...</div>}
          </div>
        </div>
      )}

      {/* Admin Confirmation Modal */}
      {administeringMed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{administeringMed.status === 'SKIPPED' ? 'Confirm Skip' : 'Confirm Administration'}</h3>
            
            <div className="flex-col" style={{ gap: '1rem' }}>
              {accountUsers.length > 0 && administeringMed.status !== 'SKIPPED' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Administered By</label>
                  <select 
                    className="input-field" 
                    value={selectedCaregiverId} 
                    onChange={e => setSelectedCaregiverId(e.target.value)}
                  >
                    {accountUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Time</label>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={adminTimeStr}
                  onChange={e => setAdminTimeStr(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Notes (Optional)</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  value={administerNotes}
                  onChange={e => setAdministerNotes(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button className="btn" onClick={() => { setAdministeringMed(null); setAdminTimeStr(''); setIsOverride(false); }} style={{ flex: 1, background: 'var(--bg-secondary)' }}>
                  Cancel
                </button>
                 <button id="submit-administer-btn" className="btn btn-success" onClick={handleAdminister} style={{ flex: 2 }} disabled={administerLoading}>
                  {administerLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Movement Modal */}
      {showMoveModal && movementData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Move Medication</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              How would you like to move <strong>{movementData.name}</strong> to {movementData.newTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {movementData.newTime.toLocaleDateString()}?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <button 
                onClick={() => handleMoveEvent('SINGLE')}
                className="btn glass-panel" 
                style={{ textAlign: 'left', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}
                disabled={isUpdating}
              >
                <div style={{ fontWeight: 'bold' }}>Move ONLY this instance</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Future events will remain at their original times.</div>
              </button>
              
              <button 
                onClick={() => handleMoveEvent('OFFSET')}
                className="btn glass-panel" 
                style={{ textAlign: 'left', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}
                disabled={isUpdating}
              >
                <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>Offset this and ALL future instances</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Keeps the schedule rhythm by shifting everything forward/backward.</div>
              </button>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                <input 
                  type="checkbox" 
                  checked={rememberMove} 
                  onChange={e => setRememberMove(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
                <span style={{ fontSize: '0.9rem' }}>Don't ask me again (save as default)</span>
              </label>
              
              <button 
                onClick={() => { setShowMoveModal(false); setMovementData(null); }}
                className="btn" 
                style={{ marginTop: '0.5rem', opacity: 0.6 }}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
            {isUpdating && <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--accent-primary)' }}>Updating schedule...</div>}
          </div>
        </div>
      )}
      {draggedItem && previewTime && (
        <div 
          style={{
            position: 'fixed',
            left: mousePos.x + 20,
            top: mousePos.y - 12, // Align roughly with the top of the item content
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          <div className="glass-panel" style={{ 
            padding: '0.6rem 0.8rem', 
            background: 'var(--accent-primary)', 
            color: 'white',
            borderLeft: `5px solid white`,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '160px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
            transform: 'scale(1.02)',
            animation: 'fadeIn 0.1s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                {(() => {
                  const LucideIcon = (Icons as any)[draggedItem.icon || 'Pill'] || Icons.Pill
                  return <LucideIcon size={14} />
                })()}
                <span>{draggedItem.name}</span>
              </div>
              <div className="time-badge" style={{ background: 'white', color: 'var(--accent-primary)', boxShadow: 'none', fontSize: '0.7rem' }}>
                {previewTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Undo/Redo Toast */}
      {showUndoToast && (lastActionDescription || lastRedoDescription) && (
        <div className="undo-toast" style={{ minWidth: '380px', maxWidth: '450px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '50%', color: 'white', display: 'flex' }}>
                  <Icons.History size={18} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {lastActionDescription || 'No actions to undo'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {undoCount > 0 ? `${undoCount} steps available` : 'History menu'}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button 
                  onClick={() => setIsUndoPinned(!isUndoPinned)}
                  style={{ 
                    background: isUndoPinned ? 'var(--accent-primary)' : 'none', 
                    border: 'none', 
                    color: isUndoPinned ? 'white' : 'var(--text-secondary)', 
                    cursor: 'pointer', 
                    padding: '0.4rem',
                    borderRadius: '6px',
                    display: 'flex',
                    transition: 'all 0.2s'
                  }}
                  title={isUndoPinned ? "Keep open" : "Pin Menu"}
                >
                  <Icons.Pin size={16} style={{ transform: isUndoPinned ? 'rotate(45deg)' : 'none' }} />
                  <span style={{ fontSize: '0.7rem', marginLeft: '2px', fontWeight: 'bold' }}>{isUndoPinned ? 'STICKY' : 'STAY?'}</span>
                </button>
                <button 
                  onClick={() => setShowUndoToast(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem', display: 'flex' }}
                  title="Dismiss"
                >
                  <Icons.X size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button 
                onClick={handleUndo}
                disabled={isUndoing || undoCount === 0}
                className="btn"
                style={{ 
                  background: undoCount > 0 ? 'rgba(99, 102, 241, 0.1)' : 'transparent', 
                  border: '1px solid var(--accent-primary)', 
                  color: 'var(--accent-primary)',
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: undoCount === 0 ? 0.3 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isUndoing ? <Icons.Loader2 className="animate-spin" size={14} /> : <Icons.Undo2 size={16} />}
                <span>Undo</span>
              </button>

              <button 
                onClick={handleRedo}
                disabled={isUndoing || redoCount === 0}
                className="btn"
                style={{ 
                  background: redoCount > 0 ? 'rgba(34, 197, 94, 0.1)' : 'transparent', 
                  border: '1px solid var(--success)', 
                  color: 'var(--success)',
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: redoCount === 0 ? 0.3 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isUndoing ? <Icons.Loader2 className="animate-spin" size={14} /> : <Icons.Redo2 size={16} />}
                <span>Redo</span>
              </button>
            </div>

            {redoCount > 0 && lastRedoDescription && (
               <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem' }}>
                 Next Redo: {lastRedoDescription}
               </p>
            )}
          </div>
        </div>
      )}
      {conflictData && (
        <ConflictModal
          conflictData={conflictData}
          onCancel={() => setConflictData(null)}
          onOverride={(action, data) => {
            setConflictData(null)
            if (action === 'MOVE') {
              handleMoveEvent('SINGLE', { ...data, isOverride: true })
            } else if (action === 'OFFSET') {
              handleMoveEvent('OFFSET', { ...data, isOverride: true })
            } else if (action === 'ADMINISTER') {
              setIsOverride(true)
              setTimeout(() => {
                  const submitBtn = document.getElementById('submit-administer-btn');
                  if (submitBtn) submitBtn.click();
              }, 100);
            }
          }}
        />
      )}

      {/* Violation Detail Modal */}
      {violationDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
              <Icons.AlertTriangle size={24} /> {violationDetail.title}
            </h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{violationDetail.message}</p>
            <button className="btn" style={{ width: '100%', background: 'var(--bg-secondary)' }} onClick={() => setViolationDetail(null)}>Close</button>
          </div>
        </div>
      )}
    </main>
  )
}
