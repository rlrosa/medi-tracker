import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const dumpPath = path.join(process.cwd(), 'meditracker_dump_2026-03-26.json')
  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'))

  console.log('Clearing existing data...')
  // Order matters due to foreign keys
  await prisma.administrationLog.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.medicationSchedule.deleteMany()
  await prisma.medication.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.user.deleteMany()
  await prisma.account.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.medicationTemplate.deleteMany()

  console.log('Seeding Accounts...')
  for (const item of data.Account) {
    await prisma.account.create({ data: item })
  }

  console.log('Seeding Users...')
  for (const item of data.User) {
    await prisma.user.create({ data: item })
  }

  console.log('Seeding Patients...')
  for (const item of data.Patient) {
    await prisma.patient.create({ data: item })
  }

  console.log('Seeding Medications...')
  for (const item of data.Medication) {
    await prisma.medication.create({ data: item })
  }

  console.log('Seeding MedicationSchedules...')
  for (const item of data.MedicationSchedule) {
    await prisma.medicationSchedule.create({ data: item })
  }

  // Generate Events for each schedule
  console.log('Generating MedicationEvents...')
  const schedules = await prisma.medicationSchedule.findMany()
  for (const schedule of schedules) {
    // Basic logic to generate 30 days of events
    let currentDue = schedule.startDate ? new Date(schedule.startDate) : new Date(schedule.createdAt)
    const intervalMs = (schedule.intervalHours || 24) * 60 * 60 * 1000
    const horizon = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
    const endLimit = schedule.endDate && schedule.endDate < horizon ? schedule.endDate : horizon
    
    // Day of week check
    const daysOfWeek = schedule.daysOfWeek ? schedule.daysOfWeek.split(',').map(Number) : null

    while (currentDue <= endLimit) {
      const match = !daysOfWeek || daysOfWeek.includes(currentDue.getDay())
      if (match) {
        await prisma.medicationEvent.create({
          data: {
            scheduleId: schedule.id,
            medicationId: schedule.medicationId,
            time: new Date(currentDue),
            originalTime: new Date(currentDue),
            status: 'PENDING'
          }
        })
      }
      currentDue = new Date(currentDue.getTime() + intervalMs)
      if (schedule.intervalHours === null) break
    }
  }

  console.log('Seeding AdministrationLogs...')
  for (const item of data.AdministrationLog) {
    const log = await prisma.administrationLog.create({ data: item })
    // Attempt to link to the closest event
    if (log.scheduleId) {
       const event = await prisma.medicationEvent.findFirst({
         where: {
           scheduleId: log.scheduleId,
           time: {
             gte: new Date(new Date(log.administeredAt).getTime() - 2 * 60 * 60 * 1000), // 2 hour window
             lte: new Date(new Date(log.administeredAt).getTime() + 2 * 60 * 60 * 1000)
           }
         }
       })
       if (event) {
         await prisma.medicationEvent.update({
           where: { id: event.id },
           data: { 
             status: 'COMPLETED',
             log: { connect: { id: log.id } }
           }
         })
         // No need to update administrationLog separately if event already connects to it
       }
    }
  }

  console.log('Seeding Invitations...')
  for (const item of data.Invitation) {
    await prisma.invitation.create({ data: item })
  }

  console.log('Seeding MedicationTemplates...')
  for (const item of data.MedicationTemplate) {
    await prisma.medicationTemplate.create({ data: item })
  }

  console.log('Local database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
