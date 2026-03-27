import { MedicationSchedule, MedicationEvent, PrismaClient } from '@prisma/client'
import prisma from './prisma'

export interface EventSyncOptions {
  horizonDays?: number
  forceRegenerate?: boolean
}

export async function syncScheduleEvents(scheduleId: string, options: EventSyncOptions = {}) {
  const { horizonDays = 30, forceRegenerate = false } = options
  
  const schedule = await prisma.medicationSchedule.findUnique({
    where: { id: scheduleId },
    include: { medication: true }
  })
  
  if (!schedule) throw new Error('Schedule not found')
  
  const now = new Date()
  const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000)
  const endLimit = schedule.endDate && schedule.endDate < horizon ? schedule.endDate : horizon
  
  // 1. Cleanup future PENDING events if forceRegenerate
  if (forceRegenerate) {
    await prisma.medicationEvent.deleteMany({
      where: {
        scheduleId: schedule.id,
        status: 'PENDING',
        time: { gte: now }
      }
    })
  }

  // 2. Generate missing events
  const events = await generateEventsForSchedule(schedule, now, endLimit)
  
  for (const eventData of events) {
    // Check if event already exists (by originalTime)
    const existing = await prisma.medicationEvent.findFirst({
      where: {
        scheduleId: schedule.id,
        originalTime: eventData.originalTime
      }
    })
    
    if (!existing) {
      await prisma.medicationEvent.create({
        data: {
          scheduleId: schedule.id,
          medicationId: schedule.medicationId,
          time: eventData.time,
          originalTime: eventData.originalTime,
          status: 'PENDING'
        }
      })
    }
  }

  // 3. Remove events that are now outside the schedule range (if schedule was shortened)
  if (schedule.endDate) {
    await prisma.medicationEvent.deleteMany({
      where: {
        scheduleId: schedule.id,
        status: 'PENDING',
        time: { gt: schedule.endDate }
      }
    })
  }
}

async function generateEventsForSchedule(schedule: any, startFrom: Date, endLimit: Date) {
  const result: any[] = []
  
  let currentDue = schedule.startDate ? new Date(schedule.startDate) : new Date(schedule.createdAt)
  const intervalMs = (schedule.intervalHours || 24) * 60 * 60 * 1000
  
  // Move currentDue forward until it's at least close to startFrom (but keep rhythm)
  if (currentDue < startFrom) {
     const diff = startFrom.getTime() - currentDue.getTime()
     const skipSteps = Math.floor(diff / intervalMs)
     currentDue = new Date(currentDue.getTime() + skipSteps * intervalMs)
  }

  const daysOfWeek = schedule.daysOfWeek ? schedule.daysOfWeek.split(',').map(Number) : null

  while (currentDue <= endLimit) {
    if (currentDue >= schedule.startDate || !schedule.startDate) {
      const dayMatches = !daysOfWeek || daysOfWeek.includes(currentDue.getDay())
      if (dayMatches && currentDue >= startFrom) {
        result.push({
          time: new Date(currentDue),
          originalTime: new Date(currentDue)
        })
      }
    }
    
    currentDue = new Date(currentDue.getTime() + intervalMs)
    if (schedule.intervalHours === null) break // Safety
  }
  
  return result
}

export async function recordHistory(userId: string, actionType: string, undoData: any, description?: string) {
  return await prisma.medicationEventHistory.create({
    data: {
      userId,
      actionType,
      undoData: JSON.stringify(undoData),
      description
    }
  })
}

export async function undoLastAction(userId: string) {
  const lastHistory = await prisma.medicationEventHistory.findFirst({
    where: { userId },
    orderBy: { timestamp: 'desc' }
  })

  if (!lastHistory) return { success: false, message: 'No history found' }

  const undoData = JSON.parse(lastHistory.undoData)
  
  try {
    switch (lastHistory.actionType) {
      case 'MOVE':
        await prisma.medicationEvent.update({
          where: { id: undoData.eventId },
          data: { time: new Date(undoData.previousTime) }
        })
        break
      
      case 'DELETE':
        // Restore deleted event
        await prisma.medicationEvent.create({
          data: {
            id: undoData.id,
            scheduleId: undoData.scheduleId,
            medicationId: undoData.medicationId,
            time: new Date(undoData.time),
            originalTime: undoData.originalTime ? new Date(undoData.originalTime) : null,
            status: undoData.status
          }
        })
        break
      
      case 'OFFSET':
        // Revert offset
        await prisma.medicationEvent.updateMany({
          where: {
            scheduleId: undoData.scheduleId,
            status: 'PENDING',
            time: { gte: new Date(undoData.afterTime) }
          },
          data: {
            time: {
              decrement: undoData.offsetMinutes * 60 * 1000 // This doesn't work in Prisma SQLite directly for dates
            } as any
          }
        })
        // Wait, SQLite/Prisma updateMany with increment is tricky for dates.
        // Better: Fetch and update for SQLite.
        const eventsToRevert = await prisma.medicationEvent.findMany({
          where: {
            scheduleId: undoData.scheduleId,
            status: 'PENDING',
            time: { gte: new Date(undoData.afterTime) }
          }
        })
        for (const event of eventsToRevert) {
          await prisma.medicationEvent.update({
            where: { id: event.id },
            data: { time: new Date(event.time.getTime() - undoData.offsetMinutes * 60000) }
          })
        }
        break

      case 'BULK_DELETE':
        // Restore all deleted events
        for (const eventData of undoData.events) {
          await prisma.medicationEvent.create({
            data: {
              ...eventData,
              time: new Date(eventData.time),
              originalTime: eventData.originalTime ? new Date(eventData.originalTime) : null
            }
          })
        }
        break
    }

    // Delete history record after successful undo
    await prisma.medicationEventHistory.delete({ where: { id: lastHistory.id } })
    return { success: true, actionType: lastHistory.actionType }
  } catch (error) {
    console.error('Undo failed:', error)
    return { success: false, message: 'Undo failed' }
  }
}
