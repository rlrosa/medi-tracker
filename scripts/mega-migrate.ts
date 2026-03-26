import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting MEGA Medication Migration (Multitenancy + Schedules)...')

  // 1. Create a Default Account for all existing legacy data
  let account = await prisma.account.findFirst({ where: { name: 'Legacy Migrated Account' } })
  if (!account) {
    account = await prisma.account.create({
      data: { name: 'Legacy Migrated Account', type: 'SOLO' }
    })
    console.log(`🏢 Created System Account: ${account.id}`)
  }

  // 2. Map Users to Account
  const legacyUsers: any[] = await prisma.$queryRaw`SELECT * FROM "User"`
  for (const user of legacyUsers) {
    console.log(`👤 Migrating User: ${user.username || user.id}`)
    await prisma.user.update({
      where: { id: user.id },
      data: { accountId: account.id }
    })

    // Create a Patient for this user if they don't have one
    let patient = await prisma.patient.findFirst({ where: { userId: user.id } })
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name: user.name || user.username || 'Default Patient',
          accountId: account.id,
          userId: user.id
        }
      })
      console.log(`🏥 Created Patient for User ${user.id}: ${patient.id}`)
    }
  }

  // 3. Migrate Medications (Link to Patient & Create Schedules)
  const defaultPatient = await prisma.patient.findFirst({ where: { accountId: account.id } })
  if (!defaultPatient) throw new Error('Failed to find a patient to link medications to')

  const medications: any[] = await prisma.$queryRaw`SELECT * FROM "Medication"`
  for (const med of medications) {
    console.log(`💊 Migrating Medication: ${med.name}`)
    
    // Link medication to the first patient found (or logic could be more complex)
    await prisma.medication.update({
      where: { id: med.id },
      data: { patientId: defaultPatient.id }
    })

    // Create Schedule
    let schedule = await prisma.medicationSchedule.findFirst({ where: { medicationId: med.id } })
    if (!schedule) {
      schedule = await prisma.medicationSchedule.create({
        data: {
          medicationId: med.id,
          name: 'Default Schedule',
          intervalHours: med.intervalHours || (med.frequency === 'HOURLY' ? 1 : null),
          daysOfWeek: med.daysOfWeek || null,
          marginMinutes: med.marginMinutes ?? 30,
          color: med.color || '#6366f1',
          icon: med.icon || 'Pill'
        }
      })
      console.log(`📅 Created Schedule ${schedule.id} for ${med.name}`)
    }

    // 4. Update Logs
    const updateResult = await prisma.administrationLog.updateMany({
      where: { 
        medicationId: med.id,
        scheduleId: null 
      },
      data: {
        scheduleId: schedule.id
      }
    })
    console.log(`📝 Linked ${updateResult.count} logs for ${med.name}`)
  }

  console.log('🎉 MEGA Migration Finished Successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Migration Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
