import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Medication Schedule Migration...')

  // 1. Fetch all medications using raw SQL to access potentially "hidden" (removed from schema but present in DB) columns
  // Old columns: frequency, hour, minute, daysOfWeek, intervalHours, marginMinutes, color, icon
  const medications: any[] = await prisma.$queryRaw`SELECT * FROM "Medication"`

  for (const med of medications) {
    console.log(`📦 Migrating: ${med.name} (${med.id})...`)

    // Check if a schedule already exists to avoid duplicates
    const existingSchedules = await prisma.medicationSchedule.findMany({
      where: { medicationId: med.id }
    })

    if (existingSchedules.length > 0) {
      console.log(`⚠️ Skiping ${med.name}: Schedule already exists.`)
      continue
    }

    // Create a new MedicationSchedule based on legacy fields
    // We map legacy fields to the new model
    const newSchedule = await prisma.medicationSchedule.create({
      data: {
        medicationId: med.id,
        name: 'Default Schedule',
        intervalHours: med.intervalHours || (med.frequency === 'HOURLY' ? 1 : null),
        daysOfWeek: med.daysOfWeek || null,
        marginMinutes: med.marginMinutes ?? 30,
        color: med.color || '#6366f1',
        icon: med.icon || 'Pill',
        // If it was daily at a specific time, we might want to store that in a better way, 
        // but for now we follow the existing pattern.
      }
    })

    console.log(`✅ Created schedule ${newSchedule.id} for ${med.name}`)

    // 2. Update existing AdministrationLog entries to point to this new schedule
    const updateResult = await prisma.administrationLog.updateMany({
      where: { 
        medicationId: med.id,
        scheduleId: null // Only update logs that don't have a schedule yet
      },
      data: {
        scheduleId: newSchedule.id
      }
    })

    console.log(`📝 Updated ${updateResult.count} logs for ${med.name}`)
  }

  console.log('🎉 Migration Finished Successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Migration Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
