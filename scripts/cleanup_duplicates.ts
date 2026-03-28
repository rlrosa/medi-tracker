import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('--- Starting Duplicate Event Cleanup ---')

  const pendingEvents = await prisma.medicationEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' }, // Keep the newest one by default
    include: { medication: true }
  })
  
  // Group by scheduleId + time
  const groups = new Map<string, any[]>()
  
  for (const event of pendingEvents) {
    const key = `${event.scheduleId}-${event.time.toISOString()}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(event)
  }

  let deletedCount = 0
  
  for (const [key, events] of groups.entries()) {
    if (events.length > 1) {
      console.log(`Found ${events.length} duplicate events for schedule ${events[0].scheduleId} at ${events[0].time.toISOString()}`)
      
      // Keep the first (newest), delete the rest
      const [keep, ...duplicates] = events
      
      for (const dup of duplicates) {
        await prisma.medicationEvent.delete({
          where: { id: dup.id }
        })
        deletedCount++
        console.log(`  -> Deleted duplicate event ${dup.id} (${dup.medication.name})`)
      }
    }
  }

  console.log(`\n--- Finished Cleanup. Total duplicates deleted: ${deletedCount} ---`)
}

main().finally(() => prisma.$disconnect())
