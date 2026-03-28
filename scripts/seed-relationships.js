
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding medication relationships...')

  // Find medications for the 'rr' user (assuming patientId is related)
  const meds = await prisma.medication.findMany()
  if (meds.length < 2) {
    console.log('Not enough medications found to create relationships.')
    return
  }

  const medA = meds.find(m => m.name.toLowerCase().includes('percocet')) || meds[0]
  const medB = meds.find(m => m.name.toLowerCase().includes('ibuprofen')) || meds[1]

  console.log(`Creating relationship between ${medA.name} and ${medB.name}`)

  // Relationship: Med A must be "FAR_FROM" Med B by at least 2 hours (120 mins)
  await prisma.medicationRelationship.deleteMany({
    where: {
      medicationAId: medA.id,
      medicationBId: medB.id
    }
  })
  
  await prisma.medicationRelationship.create({
    data: {
      medicationAId: medA.id,
      medicationBId: medB.id,
      type: 'FAR_FROM',
      valueMinutes: 120
    }
  })

  // Relationship: Med B must be "NEAR_TO" Med A by no more than 6 hours (360 mins)
  await prisma.medicationRelationship.deleteMany({
    where: {
      medicationAId: medB.id,
      medicationBId: medA.id
    }
  })

  await prisma.medicationRelationship.create({
    data: {
      medicationAId: medB.id,
      medicationBId: medA.id,
      type: 'NEAR_TO',
      valueMinutes: 360
    }
  })

  console.log('Seeding complete.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
