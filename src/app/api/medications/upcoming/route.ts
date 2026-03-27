import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const hoursStr = url.searchParams.get('hours') || '24' 
    const hours = parseInt(hoursStr, 10)
    const startStr = url.searchParams.get('startDate')
    
    const now = new Date()
    const startDate = startStr ? new Date(startStr) : now
    const futureLimit = new Date(startDate.getTime() + hours * 60 * 60 * 1000)

    const medications = await prisma.medication.findMany({
      where: {
        patient: {
          accountId: session.accountId as string
        }
      },
      include: {
        patient: true,
        schedules: true,
        logs: {
          orderBy: { administeredAt: 'desc' },
          take: 20 
        }
      }
    })

    const upcoming: any[] = []

    medications.forEach(med => {
      med.schedules.forEach(schedule => {
        // Check dates - relative to the requested range
        if (schedule.endDate && schedule.endDate < startDate) return
        if (schedule.startDate && schedule.startDate > futureLimit) return

        // Look back up to 24 hours for overdue doses
        const lookbackLimit = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)

        // Determine earliest projection point (Anchor to startDate or Midnight of createdAt for consistency)
        let currentDue: Date | null = schedule.startDate 
          ? new Date(schedule.startDate) 
          : new Date(new Date(schedule.createdAt).setUTCHours(0,0,0,0))
        
        // Move currentDue forward until it's within lookback window
        if (schedule.intervalHours) {
          while (currentDue.getTime() < lookbackLimit.getTime()) {
            currentDue = new Date(currentDue.getTime() + schedule.intervalHours * 60 * 60 * 1000)
          }
        }

        while (currentDue && currentDue <= futureLimit) {
          if (schedule.endDate && currentDue > new Date(schedule.endDate)) break
          // Check if this specific instance is already in logs
          const isAlreadyLogged = med.logs.some(l => {
            // Match if same schedule OR if log has no scheduleId BUT happened after schedule start
            const scheduleMatch = l.scheduleId === schedule.id || (l.scheduleId === null && new Date(l.administeredAt) >= new Date(schedule.startDate || 0))
            if (!scheduleMatch) return false
            
            // Exact match on scheduledAt
            if (l.scheduledAt && Math.abs(new Date(l.scheduledAt).getTime() - currentDue!.getTime()) < (2 * 60 * 1000)) {
              return true
            }
            
            // Proximity match: administered within 3 hours of currentDue
            const administeredAt = new Date(l.administeredAt).getTime()
            const scheduledAt = currentDue!.getTime()
            const marginMs = 3 * 60 * 60 * 1000 // 3 hour window (matching calendar logic)
            
            return Math.abs(administeredAt - scheduledAt) < marginMs
          })

          if (!isAlreadyLogged) {
            // Day of week check
            let isDayIncluded = true
            if (schedule.daysOfWeek) {
              const instanceDay = currentDue.getDay()
              const parts = schedule.daysOfWeek.split(',')
              let match = false
              for (const p of parts) {
                const trimmed = p.trim()
                if (trimmed.includes('-')) {
                  const [start, end] = trimmed.split('-').map(Number)
                  if (instanceDay >= start && instanceDay <= end) { match = true; break; }
                } else if (Number(trimmed) === instanceDay) {
                  match = true;
                  break;
                }
              }
              isDayIncluded = match
            }

            if (isDayIncluded) {
              upcoming.push({
                id: med.id,
                name: med.name,
                alias: med.alias,
                imageUrl: med.imageUrl,
                patient: med.patient,
                scheduleName: schedule.name,
                scheduleId: schedule.id,
                scheduleStartDate: schedule.startDate,
                scheduleEndDate: schedule.endDate,
                color: schedule.color || '#6366f1',
                icon: schedule.icon || 'Pill',
                marginMinutes: schedule.marginMinutes || 30,
                nextDue: new Date(currentDue),
                isOverdue: currentDue < now,
                instanceId: `${med.id}-${schedule.id}-${currentDue.getTime()}`
              })
            }
          }
          
          if (schedule.intervalHours) {
            currentDue = new Date(currentDue.getTime() + schedule.intervalHours * 60 * 60 * 1000)
          } else {
            break
          }
        }
      })
    })

    // Sort all upcoming doses: Overdue FIRST, then by time
    upcoming.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      return a.nextDue.getTime() - b.nextDue.getTime()
    })

    return NextResponse.json({ upcoming })
  } catch (error) {
    console.error('Error fetching upcoming medications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
