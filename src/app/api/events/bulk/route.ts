import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { recordHistory } from '@/lib/events-manager'

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId || !session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduleId, fromTime } = await request.json()

    if (!scheduleId || !fromTime) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Verify schedule belongs to account
    const schedule = await prisma.medicationSchedule.findFirst({
      where: {
        id: scheduleId,
        medication: {
          patient: {
            accountId: session.accountId as string
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const deleteFrom = new Date(fromTime)

    // Capture events to delete for UNDO
    const eventsToDelete = await prisma.medicationEvent.findMany({
      where: {
        scheduleId: scheduleId,
        status: 'PENDING',
        time: { gte: deleteFrom }
      }
    })

    await recordHistory(
      session.userId as string, 
      'BULK_DELETE', 
      {
        mode: 'RESTORE',
        scheduleId,
        events: eventsToDelete
      },
      {
        mode: 'DELETE',
        scheduleId,
        afterTime: deleteFrom.toISOString()
      },
      `Bulk deleted future doses`
    )

    // 1. Delete all future PENDING events
    await prisma.medicationEvent.deleteMany({
      where: {
        scheduleId: scheduleId,
        status: 'PENDING',
        time: { gte: deleteFrom }
      }
    })

    // 2. Find the last remaining event to set as the new endDate
    const lastEvent = await prisma.medicationEvent.findFirst({
      where: {
        scheduleId: scheduleId,
        time: { lt: deleteFrom }
      },
      orderBy: { time: 'desc' }
    })

    // Update schedule endDate
    await prisma.medicationSchedule.update({
      where: { id: scheduleId },
      data: {
        endDate: lastEvent ? lastEvent.time : deleteFrom
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in bulk delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
