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
  
  if (forceRegenerate) {
    await prisma.medicationEvent.deleteMany({
      where: {
        scheduleId: schedule.id,
        status: 'PENDING',
        time: { gte: now }
      }
    })
  }

  const events = await generateEventsForSchedule(schedule, now, endLimit)
  
  for (const eventData of events) {
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
    if (schedule.intervalHours === null) break
  }
  
  return result
}

export async function recordHistory(userId: string, actionType: string, undoData: any, redoData: any, description: string) {
  // 1. Clear Redo stack (new actions invalidate any undone items)
  await prisma.medicationEventHistory.deleteMany({
    where: { userId, isUndone: true }
  })

  // 2. Prune existing history to exactly 10 actions total
  const count = await prisma.medicationEventHistory.count({ where: { userId } })
  if (count >= 10) {
    // Find all older records that need to go
    const toPrune = await prisma.medicationEventHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' },
      take: (count - 10) + 1
    })
    if (toPrune.length > 0) {
      await prisma.medicationEventHistory.deleteMany({
        where: { id: { in: toPrune.map(p => p.id) } }
      })
    }
  }

  return await prisma.medicationEventHistory.create({
    data: {
      userId,
      actionType,
      undoData: JSON.stringify(undoData),
      redoData: JSON.stringify(redoData),
      description,
      isUndone: false
    }
  })
}

export async function undoLastAction(userId: string) {
  const lastUndo = await prisma.medicationEventHistory.findFirst({
    where: { userId, isUndone: false },
    orderBy: { timestamp: 'desc' }
  })

  if (!lastUndo) return { success: false, message: 'Nothing to undo' }

  try {
    const lastUndoAny = lastUndo as any
    await applyAction(lastUndoAny.actionType, JSON.parse(lastUndoAny.undoData))

    await prisma.medicationEventHistory.update({
      where: { id: lastUndoAny.id },
      data: { isUndone: true }
    })

    return await getHistoryStatus(userId)
  } catch (error) {
    console.error('Undo failed:', error)
    return { success: false, message: 'Undo failed' }
  }
}

export async function redoLastAction(userId: string) {
  const lastRedo = await prisma.medicationEventHistory.findFirst({
    where: { userId, isUndone: true },
    orderBy: { timestamp: 'desc' }
  })

  if (!lastRedo) return { success: false, message: 'Nothing to redo' }

  try {
    const lastRedoAny = lastRedo as any
    await applyAction(lastRedoAny.actionType, JSON.parse(lastRedoAny.redoData))

    await prisma.medicationEventHistory.update({
      where: { id: lastRedoAny.id },
      data: { isUndone: false }
    })

    return await getHistoryStatus(userId)
  } catch (error) {
    console.error('Redo failed:', error)
    return { success: false, message: 'Redo failed' }
  }
}

/**
 * Core application logic for history actions.
 * undoData and redoData should follow the same interface for each actionType.
 */
async function applyAction(actionType: string, data: any) {
  switch (actionType) {
    case 'MOVE':
      await prisma.medicationEvent.update({
        where: { id: data.eventId },
        data: { time: new Date(data.time) }
      })
      break
    
    case 'DELETE':
      if (data.mode === 'RESTORE') {
        await prisma.medicationEvent.create({
          data: {
            id: data.id,
            scheduleId: data.scheduleId,
            medicationId: data.medicationId,
            time: new Date(data.time),
            originalTime: data.originalTime ? new Date(data.originalTime) : null,
            status: data.status
          }
        })
      } else {
        await prisma.medicationEvent.delete({ where: { id: data.id } })
      }
      break

    case 'OFFSET':
      const events = await prisma.medicationEvent.findMany({
        where: { scheduleId: data.scheduleId, status: 'PENDING' }
      })
      
      for (const event of events) {
        await prisma.medicationEvent.update({
          where: { id: event.id },
          data: { time: new Date(event.time.getTime() + data.offsetMinutes * 60000) }
        })
      }

      if (data.scheduleStartDate) {
        await prisma.medicationSchedule.update({
          where: { id: data.scheduleId },
          data: { startDate: new Date(data.scheduleStartDate) }
        })
      }
      break

    case 'BULK_DELETE':
      if (data.mode === 'RESTORE') {
         for (const eventData of data.events) {
          await prisma.medicationEvent.create({
            data: {
              ...eventData,
              time: new Date(eventData.time),
              originalTime: eventData.originalTime ? new Date(eventData.originalTime) : null
            }
          })
        }
        // Also revert schedule endDate
        await prisma.medicationSchedule.update({
          where: { id: data.scheduleId },
          data: { endDate: null } // Assuming restore means clearing the end date
        })
      } else {
        // Redo for BULK_DELETE: Re-delete future PENDING events and set endDate
        await prisma.medicationEvent.deleteMany({
          where: {
            scheduleId: data.scheduleId,
            status: 'PENDING',
            time: { gt: new Date(data.afterTime) }
          }
        })
        await prisma.medicationSchedule.update({
          where: { id: data.scheduleId },
          data: { endDate: new Date(data.afterTime) }
        })
      }
      break
  }
}

export async function getHistoryStatus(userId: string) {
  const [undoCount, redoCount, lastUndo, lastRedo] = await Promise.all([
    prisma.medicationEventHistory.count({ where: { userId, isUndone: false } }),
    prisma.medicationEventHistory.count({ where: { userId, isUndone: true } }),
    prisma.medicationEventHistory.findFirst({
      where: { userId, isUndone: false },
      orderBy: { timestamp: 'desc' }
    }),
    prisma.medicationEventHistory.findFirst({
      where: { userId, isUndone: true },
      orderBy: { timestamp: 'desc' }
    })
  ])

  return { 
    success: true,
    undoCount,
    redoCount,
    lastUndoDescription: lastUndo?.description || null,
    lastRedoDescription: lastRedo?.description || null
  }
}
