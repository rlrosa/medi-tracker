import { PrismaClient } from '@prisma/client'
import { syncScheduleEvents } from '../src/lib/events-manager'

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./prisma/prod_final.db'
      }
    }
  })

  try {
    const schedules = await prisma.medicationSchedule.findMany()
    console.log(`Syncing ${schedules.length} schedules...`)
    
    for (const schedule of schedules) {
      console.log(`Syncing schedule: ${schedule.id} (${schedule.name || 'Unnamed'})`)
      await syncScheduleEvents(schedule.id)
    }
    
    console.log('All schedules synced successfully.')
  } catch (error) {
    console.error('Error syncing schedules:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
