import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { syncScheduleEvents } from '@/lib/events-manager'

// Delete a medication
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Verify medication belongs to the account
    const medication = await prisma.medication.findFirst({
      where: {
        id,
        patient: {
          accountId: session.accountId as string
        }
      }
    })

    if (!medication) {
      return NextResponse.json({ error: 'Medication not found or unauthorized' }, { status: 404 })
    }

    await prisma.medication.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting medication', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

// Update a medication
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Verify medication belongs to the account
    const existing = await prisma.medication.findFirst({
      where: {
        id,
        patient: {
          accountId: session.accountId as string
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Medication not found or unauthorized' }, { status: 404 })
    }

    const data = await request.json()
    
    const medication = await prisma.medication.update({
      where: { id },
      data: {
        name: data.name,
        alias: data.alias || null,
        imageUrl: data.imageUrl || null,
        minIntervalMinutes: data.minIntervalMinutes !== undefined ? data.minIntervalMinutes : null,
        maxIntervalMinutes: data.maxIntervalMinutes !== undefined ? data.maxIntervalMinutes : null,
      }
    })

    if (data.schedules && Array.isArray(data.schedules)) {
      const scheduleIdsToKeep = data.schedules.filter((s: any) => s.id).map((s: any) => s.id)
      
      // Delete removed schedules
      await prisma.medicationSchedule.deleteMany({
        where: {
          medicationId: id,
          id: { notIn: scheduleIdsToKeep }
        }
      })

      // Update or Create
      for (const s of data.schedules) {
        const scheduleData = {
          name: s.name || 'Schedule',
          intervalHours: s.intervalHours ? parseInt(String(s.intervalHours), 10) : null,
          marginMinutes: s.marginMinutes !== undefined ? parseInt(String(s.marginMinutes), 10) : 30,
          daysOfWeek: s.daysOfWeek || null,
          startDate: s.startDate ? new Date(s.startDate) : null,
          endDate: s.endDate ? new Date(s.endDate) : null,
          color: s.color || null,
          icon: s.icon || null,
        }

        let updatedSchedule;
        if (s.id) {
          updatedSchedule = await prisma.medicationSchedule.update({
            where: { id: s.id },
            data: scheduleData
          })
        } else {
          updatedSchedule = await prisma.medicationSchedule.create({
            data: {
              ...scheduleData,
              medicationId: id
            }
          })
        }
        await syncScheduleEvents(updatedSchedule.id, { forceRegenerate: true })
      }
    } else {
      // Fallback: update primary schedule like before
      const primarySchedule = await prisma.medicationSchedule.findFirst({
        where: { medicationId: id },
        orderBy: { createdAt: 'asc' }
      })

      const scheduleData = {
        intervalHours: data.intervalHours ? parseInt(String(data.intervalHours), 10) : null,
        marginMinutes: data.marginMinutes !== undefined ? parseInt(String(data.marginMinutes), 10) : 30,
        daysOfWeek: data.daysOfWeek || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        color: data.color || null,
        icon: data.icon || null,
      }

      let updatedSchedule;
      if (primarySchedule) {
        updatedSchedule = await prisma.medicationSchedule.update({
          where: { id: primarySchedule.id },
          data: scheduleData
        })
      } else {
        updatedSchedule = await prisma.medicationSchedule.create({
          data: {
            ...scheduleData,
            medicationId: id,
            name: 'Primary Schedule'
          }
        })
      }
      await syncScheduleEvents(updatedSchedule.id, { forceRegenerate: true })
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error updating medication', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
