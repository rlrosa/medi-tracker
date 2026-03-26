import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Create a Coordinator Account
  const coordinatorAccount = await prisma.account.create({
    data: {
      name: 'The Smith Household',
      type: 'COORDINATOR',
    },
  })

  // 2. Create an Admin User for the Account
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@smith.com',
      name: 'John Smith',
      passwordHash,
      role: 'ADMIN',
      accountId: coordinatorAccount.id,
    },
  })

  // 3. Create a Caregiver User for the Account
  const caregiverUser = await prisma.user.create({
    data: {
      email: 'caregiver@smith.com',
      name: 'Mary Jane',
      passwordHash,
      role: 'USER',
      accountId: coordinatorAccount.id,
    },
  })

  // 4. Create Patients
  const grandma = await prisma.patient.create({
    data: {
      name: 'Grandma Betty',
      accountId: coordinatorAccount.id,
    },
  })

  const selfPatient = await prisma.patient.create({
    data: {
      name: 'John (Self)',
      selfMedication: true,
      accountId: coordinatorAccount.id,
    },
  })

  // 5. Create Medications
  await prisma.medication.create({
    data: {
      name: 'Aspirin',
      alias: 'Heart Med',
      patientId: grandma.id,
      schedules: {
        create: {
          name: 'Morning & Evening',
          intervalHours: 12,
          marginMinutes: 60,
          color: '#f87171',
          icon: 'Pill',
        }
      }
    },
  })

  await prisma.medication.create({
    data: {
      name: 'Vitamin D',
      patientId: selfPatient.id,
      schedules: {
        create: {
          name: 'Daily Morning',
          intervalHours: 24,
          marginMinutes: 120,
          color: '#fbbf24',
          icon: 'Sun',
        }
      }
    },
  })

  // 6. Create Medication Templates
  await prisma.medicationTemplate.createMany({
    data: [
      { name: 'Daily Morning', intervalHours: 24, marginMinutes: 60, color: '#60a5fa', icon: 'Sunrise' },
      { name: 'Twice Daily', intervalHours: 12, marginMinutes: 30, color: '#34d399', icon: 'Clock' },
    ],
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
