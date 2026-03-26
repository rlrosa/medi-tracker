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
        logs: {
          orderBy: { administeredAt: 'desc' },
          take: 1
        }
      }
    })

    const upcoming: any[] = []

    medications.forEach(med => {
      let nextDue: Date | null = null

      // Check dates
      if (med.endDate && med.endDate < now) return null
      if (med.startDate && med.startDate > futureLimit) return null

      // Day of week check
      const currentDayNumber = now.getDay()
      if (med.daysOfWeek) {
        let isIncluded = false
        const parts = med.daysOfWeek.split(',')
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

      if (med.logs.length > 0 && med.intervalHours) {
        const lastLog = med.logs[0]
        const baseTime = lastLog.scheduledAt ? new Date(lastLog.scheduledAt) : new Date(lastLog.administeredAt)
        nextDue = new Date(baseTime.getTime() + med.intervalHours * 60 * 60 * 1000)
      } else {
        // Not administered yet, due at start date or now
        nextDue = med.startDate ? new Date(med.startDate) : now
        if (nextDue < now) {
          // If startDate was in the past, and it has interval, it should be overdue by a lot, or we just project it forward
          // Actually, if it's new and has missed its startDate, we say it's due at that startDate.
        }
      }

      let currentDue = new Date(nextDue)
      
      while (currentDue <= futureLimit) {
        upcoming.push({
          ...med,
          nextDue: new Date(currentDue),
          isOverdue: currentDue < now,
          instanceId: `${med.id}-${currentDue.getTime()}`
        })
        
        if (med.intervalHours) {
          currentDue = new Date(currentDue.getTime() + med.intervalHours * 60 * 60 * 1000)
        } else {
          break
        }
      }
    })

    // Sort all upcoming doses across all medications by time
    upcoming.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())

    return NextResponse.json({ upcoming })
  } catch (error) {
    console.error('Error fetching upcoming medications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
