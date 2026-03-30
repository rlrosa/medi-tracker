import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration to multi-tenant...')

  const users = await prisma.user.findMany({
    include: {
      account: true
    }
  })

  console.log(`Found ${users.length} users.`)

  for (const user of users) {
    if (user.accountId) {
      // Check if access already exists
      const existingAccess = await prisma.accountAccess.findUnique({
        where: {
          userId_accountId: {
            userId: user.id,
            accountId: user.accountId
          }
        }
      })

      if (!existingAccess) {
        await prisma.accountAccess.create({
          data: {
            userId: user.id,
            accountId: user.accountId,
            role: user.role === 'ADMIN' ? 'ADMIN' : 'CAREGIVER'
          }
        })
        console.log(`Created access for user ${user.email || user.username} to account ${user.accountId}`)
      }
    }

    // Set approved to true for existing users
    await prisma.user.update({
      where: { id: user.id },
      data: { isApproved: true }
    })
    console.log(`Approved user ${user.email || user.username}`)
  }

  console.log('Migration completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
