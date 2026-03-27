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

        let nextDue: Date | null = null

        // Find last log for THIS schedule
        const lastLog = med.logs.find(log => log.scheduleId === schedule.id)

        if (lastLog && schedule.intervalHours) {
          const baseTime = lastLog.scheduledAt ? new Date(lastLog.scheduledAt) : new Date(lastLog.administeredAt)
          nextDue = new Date(baseTime.getTime() + schedule.intervalHours * 60 * 60 * 1000)
        } else {
          // Not administered yet, due at start date or earliest possible
          nextDue = schedule.startDate ? new Date(schedule.startDate) : now
        }

        // Look back up to 24 hours for overdue doses that weren't caught
        const lookbackLimit = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
        
        // Find the earliest dose we should care about (either nextDue or some point in the past)
        // If nextDue is already after lookbackLimit, use it.
        // Otherwise, if it's way in the past, move it forward until it hits the lookback window.
        if (schedule.intervalHours && nextDue) {
          while (nextDue.getTime() < lookbackLimit.getTime()) {
            nextDue = new Date(nextDue.getTime() + schedule.intervalHours * 60 * 60 * 1000)
          }
        }

        let currentDue = nextDue ? new Date(nextDue) : null
        
        while (currentDue && currentDue <= futureLimit) {
          // Day of week check for EACH instance
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

          if (isDayIncluded && currentDue >= lookbackLimit) {
            upcoming.push({
              id: med.id,
              name: med.name,
              alias: med.alias,
              imageUrl: med.imageUrl,
              patient: med.patient,
              scheduleName: schedule.name,
              scheduleId: schedule.id,
              color: schedule.color || '#6366f1',
              icon: schedule.icon || 'Pill',
              marginMinutes: schedule.marginMinutes || 30,
              nextDue: new Date(currentDue),
              isOverdue: currentDue < now,
              instanceId: `${med.id}-${schedule.id}-${currentDue.getTime()}`
            })
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
