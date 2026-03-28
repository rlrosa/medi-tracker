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

    // Simply fetch PENDING events within the requested range
    const events = await prisma.medicationEvent.findMany({
      where: {
        medication: {
          patient: {
            accountId: session.accountId as string
          }
        },
        status: 'PENDING',
        time: {
          gte: new Date(startDate.getTime() - 24 * 60 * 60 * 1000), // Include overdue from last 24h
          lte: futureLimit
        }
      },
      include: {
        medication: {
          include: {
            patient: true
          }
        },
        schedule: true
      }
    })

    const upcoming = events.map(event => ({
      id: event.medication.id,
      name: event.medication.name,
      alias: event.medication.alias,
      imageUrl: event.medication.imageUrl,
      patient: event.medication.patient,
      scheduleName: event.schedule.name,
      scheduleId: event.schedule.id,
      scheduleStartDate: event.schedule.startDate,
      scheduleEndDate: event.schedule.endDate,
      color: event.schedule.color || '#6366f1',
      icon: event.schedule.icon || 'Pill',
      marginMinutes: event.schedule.marginMinutes || 30,
      nextDue: event.time,
      isOverdue: event.time < now,
      instanceId: event.id, // Now using the real DB ID
      originalTime: event.originalTime,
      warningType: (event as any).warningType,
      isOverride: (event as any).isOverride
    }))

    // Sort: Overdue FIRST, then by time
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
