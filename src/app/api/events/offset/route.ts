import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { recordHistory } from '@/lib/events-manager'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId || !session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduleId, fromEventId, deltaMinutes } = await request.json()

    const fromEvent = await prisma.medicationEvent.findUnique({
      where: { id: fromEventId }
    })

    if (!fromEvent) {
      return NextResponse.json({ error: 'Reference event not found' }, { status: 404 })
    }

    // Get all future PENDING events for this schedule
    const futureEvents = await prisma.medicationEvent.findMany({
      where: {
        scheduleId: scheduleId,
        status: 'PENDING',
        time: { gte: fromEvent.time }
      }
    })

    const deltaMs = deltaMinutes * 60000

    // Get the schedule to record its current startDate
    const schedule = await prisma.medicationSchedule.findUnique({
      where: { id: scheduleId }
    })

    // Record HISTORY for OFFSET
    await recordHistory(session.userId, 'OFFSET', {
      scheduleId,
      afterTime: fromEvent.time.toISOString(),
      offsetMinutes: deltaMinutes,
      originalScheduleStartDate: schedule?.startDate?.toISOString()
    }, `Shifted future doses`)

    // Update all in a transaction
    await prisma.$transaction(
      futureEvents.map(event => 
        prisma.medicationEvent.update({
          where: { id: event.id },
          data: {
            time: new Date(event.time.getTime() + deltaMs)
          }
        })
      )
    )

    // Also update the schedule's startDate rhythm if needed
    // Re-using the 'schedule' fetched earlier for history recording
    if (schedule && schedule.startDate) {
        await prisma.medicationSchedule.update({
            where: { id: scheduleId },
            data: {
                startDate: new Date(schedule.startDate.getTime() + deltaMs)
            }
        })
    }

    return NextResponse.json({ success: true, count: futureEvents.length })
  } catch (error) {
    console.error('Error offsetting future events', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
