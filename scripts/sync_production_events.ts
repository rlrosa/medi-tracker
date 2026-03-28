import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('--- Starting Production Projection Sync ---')
  console.log('Connecting to database:', process.env.DATABASE_URL?.split('@')[1] || process.env.DATABASE_URL)

  try {
    const schedules = await prisma.medicationSchedule.findMany({
      include: { medication: true }
    })
    
    console.log(`Found ${schedules.length} schedules. Generating future events...`)
    
    for (const schedule of schedules) {
      console.log(`Syncing events for schedule ${schedule.id} (Medication: ${schedule.medication.name})...`)
      await syncScheduleEvents(prisma, schedule.id)
    }

    console.log('--- Projection Sync Finished Successfully ---')
  } catch (error) {
    console.error('Error syncing events:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function syncScheduleEvents(prisma: PrismaClient, scheduleId: string) {
  const schedule = await prisma.medicationSchedule.findUnique({
    where: { id: scheduleId },
    include: { medication: true }
  })
  if (!schedule) return

  const now = new Date()
  const horizonDays = 30
  const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000)
  const endLimit = schedule.endDate && schedule.endDate < horizon ? schedule.endDate : horizon

  const events = generateEventsForSchedule(schedule, now, endLimit)
  let createdCount = 0
  
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
      createdCount++
    }
  }
  console.log(`  -> Created ${createdCount} new future events.`)
}

function generateEventsForSchedule(schedule: any, startFrom: Date, endLimit: Date) {
  const result: any[] = []
  let currentDue = schedule.startDate ? new Date(schedule.startDate) : new Date(schedule.createdAt)
  const intervalMs = (schedule.intervalHours || 24) * 60 * 60 * 1000
  
  // Fast forward to current time if needed
  if (currentDue < startFrom) {
     const diff = startFrom.getTime() - currentDue.getTime()
     const skipSteps = Math.floor(diff / intervalMs)
     currentDue = new Date(currentDue.getTime() + skipSteps * intervalMs)
  }
  
  const daysOfWeek = schedule.daysOfWeek ? schedule.daysOfWeek.split(',').map(Number) : null
  
  while (currentDue <= endLimit) {
    if (currentDue >= (schedule.startDate || schedule.createdAt)) {
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
    if (result.length > 500) break // Safety limit
  }
  return result
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
