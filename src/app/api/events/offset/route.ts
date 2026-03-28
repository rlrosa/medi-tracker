import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { recordHistory } from '@/lib/events-manager'
import { checkViolations } from '@/lib/warning-engine'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId || !session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduleId, fromEventId, deltaMinutes, isOverride } = await request.json()

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

    // 3. WARNING CHECK (Check first event at new time)
    let warningType = null
    if (fromEvent && !isOverride) {
      const newTime = new Date(fromEvent.time.getTime() + deltaMinutes * 60000)
      const violations = await checkViolations(
        session.accountId as string, // patientId lookup needed? No, accountId is fine for session checks
        { medicationId: fromEvent.medicationId, time: newTime, id: fromEvent.id }
      )

      if (violations.length > 0) {
        return NextResponse.json({ 
          error: 'CONFLICT', 
          message: 'Offset logic detected a constraint violation',
          violations 
        }, { status: 409 })
      }
    } else if (isOverride) {
      // For simplicity, we just mark the first event if overridden
      warningType = 'OFFSET_VIOLATION'
    }

    // Record HISTORY for OFFSET
    const oldStartDate = schedule?.startDate?.toISOString()
    const newStartDate = schedule?.startDate ? new Date(schedule.startDate.getTime() + deltaMs).toISOString() : undefined

    await recordHistory(session.userId as string, 'OFFSET', 
      {
        scheduleId,
        offsetMinutes: -deltaMinutes,
        scheduleStartDate: oldStartDate
      },
      {
        scheduleId,
        offsetMinutes: deltaMinutes,
        scheduleStartDate: newStartDate
      },
      `Shifted future doses`
    )

    // Update all in a transaction
    await prisma.$transaction(
      futureEvents.map(event => 
        prisma.medicationEvent.update({
          where: { id: event.id },
          data: {
            time: new Date(event.time.getTime() + deltaMs),
            originalTime: event.originalTime ? new Date(event.originalTime.getTime() + deltaMs) : new Date(event.time.getTime() + deltaMs),
            warningType: event.id === fromEventId ? warningType : undefined,
            isOverride: isOverride || false
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
