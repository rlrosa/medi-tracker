import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { recordHistory } from '@/lib/events-manager'
import { checkViolations } from '@/lib/warning-engine'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.userId || !session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { time, status, isLastInstance, isOverride } = await request.json()
    const { id: eventId } = await params

    const event = await prisma.medicationEvent.findUnique({
      where: { id: eventId },
      include: { schedule: true }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Security check: ensure event belongs to user's account
    const medication = await prisma.medication.findUnique({
      where: { id: event.medicationId },
      include: { patient: true }
    })
    
    if (!medication || medication.patient?.accountId !== session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (isLastInstance) {
      // For Undo, we need to capture all events being deleted
      const eventsToDelete = await prisma.medicationEvent.findMany({
        where: {
          scheduleId: event.scheduleId,
          status: 'PENDING',
          time: { gt: event.time }
        }
      })

      await recordHistory(session.userId as string, 'BULK_DELETE', 
        { 
          mode: 'RESTORE',
          scheduleId: event.scheduleId, 
          events: eventsToDelete 
        },
        {
          mode: 'DELETE',
          scheduleId: event.scheduleId,
          afterTime: event.time.toISOString()
        },
        `Ended schedule ${event.schedule.name || 'medication'}`
      )

      // 1. Delete all future PENDING events for this schedule
      await prisma.medicationEvent.deleteMany({
        where: {
          scheduleId: event.scheduleId,
          status: 'PENDING',
          time: { gt: event.time }
        }
      })

      // 2. Update schedule endDate
      await prisma.medicationSchedule.update({
        where: { id: event.scheduleId },
        data: { endDate: event.time }
      })
      
      return NextResponse.json({ success: true, message: 'Schedule ended after this instance' })
    }

    // 3. WARNING CHECK (Internal & Relationships)
    let warningType = null
    let warningMessage = null
    if (time) {
      const newTime = new Date(time)
      const violations = await checkViolations(
        medication.patientId as string,
        { medicationId: event.medicationId, time: newTime, id: eventId }
      )

      if (violations.length > 0) {
        if (!isOverride) {
          return NextResponse.json({ 
            error: 'CONFLICT', 
            message: 'Medication window violation detected',
            violations 
          }, { status: 409 })
        }
        // If override, we store the first violation type for visual marking
        warningType = violations[0].type
        warningMessage = violations[0].message
      }
    }

    // Record HISTORY for MOVE
    if (time) {
      await recordHistory(session.userId as string, 'MOVE', 
        { eventId, time: event.time.toISOString() }, // Undo: back to old time
        { eventId, time: time },                      // Redo: to new time
        `Moved ${event.schedule.name || 'dose'}`
      )
    }

    const updatedEvent = await prisma.medicationEvent.update({
      where: { id: eventId },
      data: {
        time: time ? new Date(time) : undefined,
        status: status || undefined,
        warningType: warningType,
        warningMessage: warningMessage,
        isOverride: isOverride || false
      }
    })

    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('Error updating medication event', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.userId || !session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    
    // Check if event belongs to account
    const event = await prisma.medicationEvent.findUnique({
      where: { id: eventId },
      include: {
        schedule: true,
        medication: {
          include: {
            patient: true
          }
        }
      }
    })

    if (!event || event.medication.patient?.accountId !== session.accountId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Record History for Undo
    await recordHistory(session.userId as string, 'DELETE', 
      {
        mode: 'RESTORE',
        id: event.id,
        scheduleId: event.scheduleId,
        medicationId: event.medicationId,
        time: event.time.toISOString(),
        originalTime: event.originalTime?.toISOString(),
        status: event.status
      },
      { mode: 'DELETE', id: event.id },
      `Deleted dose of ${event.medication.name}`
    )

    await prisma.medicationEvent.delete({
      where: { id: eventId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
