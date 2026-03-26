import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration...')
  
  const medications = await prisma.medication.findMany()
  
  for (const med of medications) {
    if (med.intervalHours || med.daysOfWeek || med.startDate) {
      console.log(`Migrating rules for: ${med.name}`)
      
      await prisma.medicationSchedule.create({
        data: {
          medicationId: med.id,
          name: 'Primary Schedule',
          intervalHours: med.intervalHours,
          daysOfWeek: med.daysOfWeek,
          startDate: med.startDate,
          endDate: med.endDate,
          marginMinutes: med.marginMinutes || 30,
          color: med.color,
          icon: med.icon
        }
      })
    }
  }
  
  console.log('Migration complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
