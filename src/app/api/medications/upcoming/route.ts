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
    
    const now = new Date()
    const futureLimit = new Date(now.getTime() + hours * 60 * 60 * 1000)

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
        let nextDue: Date | null = null

        // Check dates
        if (schedule.endDate && schedule.endDate < now) return
        if (schedule.startDate && schedule.startDate > futureLimit) return

        // Day of week check
        const currentDayNumber = now.getDay()
        if (schedule.daysOfWeek) {
          let isIncluded = false
          const parts = schedule.daysOfWeek.split(',')
          for (const p of parts) {
            const trimmed = p.trim()
            if (trimmed.includes('-')) {
              const [start, end] = trimmed.split('-').map(Number)
              if (currentDayNumber >= start && currentDayNumber <= end) {
                isIncluded = true
                break
              }
            } else if (Number(trimmed) === currentDayNumber) {
              isIncluded = true
              break
            }
          }
          if (!isIncluded) return
        }

        // Find last log for THIS schedule
        const lastLog = med.logs.find(log => log.scheduleId === schedule.id)

        if (lastLog && schedule.intervalHours) {
          const baseTime = lastLog.scheduledAt ? new Date(lastLog.scheduledAt) : new Date(lastLog.administeredAt)
          nextDue = new Date(baseTime.getTime() + schedule.intervalHours * 60 * 60 * 1000)
        } else {
          // Not administered yet, due at start date or now
          nextDue = schedule.startDate ? new Date(schedule.startDate) : now
        }

        let currentDue = new Date(nextDue)
        
        while (currentDue <= futureLimit) {
          upcoming.push({
            ...med,
            scheduleName: schedule.name,
            scheduleId: schedule.id,
            color: schedule.color || med.color,
            icon: schedule.icon || med.icon,
            marginMinutes: schedule.marginMinutes,
            nextDue: new Date(currentDue),
            isOverdue: currentDue < now,
            instanceId: `${med.id}-${schedule.id}-${currentDue.getTime()}`
          })
          
          if (schedule.intervalHours) {
            currentDue = new Date(currentDue.getTime() + schedule.intervalHours * 60 * 60 * 1000)
          } else {
            break
          }
        }
      })
    })

    // Sort all upcoming doses across all medications by time
    upcoming.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())

    return NextResponse.json({ upcoming })
  } catch (error) {
    console.error('Error fetching upcoming medications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
