import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./prisma/prod_final.db'
    }
  }
})

const DUMP_FILE = 'prod_postgres_dump_2026-03-28T17-56-24-939Z.json'

async function main() {
  const dumpPath = path.join(process.cwd(), DUMP_FILE)
  if (!fs.existsSync(dumpPath)) {
    console.error(`Dump file not found: ${dumpPath}`)
    process.exit(1)
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'))

  console.log('--- Starting Migration ---')

  // Helper to clear existing data to prevent unique constraint failures
  const tables = ['MedicationEventHistory', 'AdministrationLog', 'MedicationEvent', 'MedicationSchedule', 'MedicationRelationship', 'Medication', 'Patient', 'User', 'Account', 'Invitation', 'MedicationTemplate', 'Setting']
  console.log('Clearing existing data...')
  for (const table of tables) {
    try {
      await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({})
    } catch (e: any) {
      console.warn(`Could not clear table ${table}:`, e.message)
    }
  }

  // 1. Account
  console.log(`Importing Accounts: ${dump.Account?.length || 0}`)
  for (const item of dump.Account || []) {
    await prisma.account.create({
      data: {
        ...item,
        createdAt: new Date(item.createdAt)
      }
    })
  }

  // 2. User
  console.log(`Importing Users: ${dump.User?.length || 0}`)
  for (const item of dump.User || []) {
    await prisma.user.create({
      data: {
        ...item,
        createdAt: new Date(item.createdAt)
      }
    })
  }

  // 3. Patient
  console.log(`Importing Patients: ${dump.Patient?.length || 0}`)
  for (const item of dump.Patient || []) {
    await prisma.patient.create({
      data: {
        ...item,
        createdAt: new Date(item.createdAt)
      }
    })
  }

  // 4. Medication
  console.log(`Importing Medications: ${dump.Medication?.length || 0}`)
  for (const item of dump.Medication || []) {
    await prisma.medication.create({
      data: {
        ...item,
        createdAt: new Date(item.createdAt)
      }
    })
  }

  // 5. MedicationSchedule
  console.log(`Importing MedicationSchedules: ${dump.MedicationSchedule?.length || 0}`)
  for (const item of dump.MedicationSchedule || []) {
    await prisma.medicationSchedule.create({
      data: {
        ...item,
        createdAt: new Date(item.createdAt),
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null
      }
    })
  }

  // 6. AdministrationLog
  console.log(`Importing AdministrationLogs: ${dump.AdministrationLog?.length || 0}`)
  for (const item of dump.AdministrationLog || []) {
    await prisma.administrationLog.create({
      data: {
        ...item,
        administeredAt: new Date(item.administeredAt),
        createdAt: new Date(item.createdAt),
        scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
        // New fields not in legacy dump
        warningType: null,
        isOverride: false,
        eventId: null
      }
    })
  }

  // 7. Invitation
  console.log(`Importing Invitations: ${dump.Invitation?.length || 0}`)
  for (const item of dump.Invitation || []) {
    await prisma.invitation.create({
      data: {
        ...item,
        createdAt: new Date(item.createdAt),
        expiresAt: new Date(item.expiresAt),
        acceptedAt: item.acceptedAt ? new Date(item.acceptedAt) : null
      }
    })
  }

  // 8. MedicationTemplate
  console.log(`Importing MedicationTemplates: ${dump.MedicationTemplate?.length || 0}`)
  for (const item of dump.MedicationTemplate || []) {
    await prisma.medicationTemplate.create({
      data: item
    })
  }

  // 9. Setting
  console.log(`Importing Settings: ${dump.Setting?.length || 0}`)
  for (const item of dump.Setting || []) {
    await prisma.setting.create({
      data: item
    })
  }

  // 10. Sync Schedules to generate Events
  console.log('Synchronizing schedules...')
  const schedules = await prisma.medicationSchedule.findMany()
  for (const schedule of schedules) {
    console.log(`Syncing ${schedule.id}...`)
    await syncScheduleEvents(prisma, schedule.id)
  }

  console.log('--- Migration Finished Successfully ---')
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
}

function generateEventsForSchedule(schedule: any, startFrom: Date, endLimit: Date) {
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
    if (result.length > 500) break // Safety
  }
  return result
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
