import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const hoursStr = url.searchParams.get('hours') || '24' 
    const hours = parseInt(hoursStr, 10)
    
    const now = new Date()
    const futureLimit = new Date(now.getTime() + hours * 60 * 60 * 1000)

    const medications = await prisma.medication.findMany({
      include: {
        logs: {
          orderBy: { administeredAt: 'desc' },
          take: 1
        }
      }
    })

    const upcoming = medications.map(med => {
      let nextDue: Date | null = null

      // Check dates
      if (med.endDate && med.endDate < now) return null
      if (med.startDate && med.startDate > futureLimit) return null

      // Day of week check (simple simplified check for MVP)
      const currentDay = now.getDay().toString()
      if (med.daysOfWeek && !med.daysOfWeek.split(',').includes(currentDay)) {
        // If not today, we should technically check if it's due tomorrow, 
        // but for a <24h window, if it's not today's day we can skip.
        // (This is a simplified assumption)
        return null
      }

      if (med.logs.length > 0 && med.intervalHours) {
        const lastAdmin = med.logs[0].administeredAt
        nextDue = new Date(lastAdmin.getTime() + med.intervalHours * 60 * 60 * 1000)
      } else {
        // Not administered yet, due at start date or now
        nextDue = med.startDate && med.startDate > now ? med.startDate : now
      }

      if (nextDue <= futureLimit) {
        return {
          ...med,
          nextDue,
          isOverdue: nextDue < now
        }
      }

      return null
    }).filter(Boolean)

    // Sort by due date
    upcoming.sort((a, b) => (a?.nextDue?.getTime() || 0) - (b?.nextDue?.getTime() || 0))

    return NextResponse.json({ upcoming })
  } catch (error) {
    console.error('Error fetching upcoming medications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
