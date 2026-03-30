import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const identifier = args[0]

  if (!identifier) {
    console.error('Please provide an email or username as the first argument.')
    console.error('Example: npx ts-node scripts/make_superadmin.ts me@example.com')
    process.exit(1)
  }

  console.log(`Looking for user: ${identifier}`)

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier }
      ]
    }
  })

  if (!user) {
    console.error(`User ${identifier} not found in database.`)
    process.exit(1)
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPERADMIN' }
  })

  console.log(`User ${updatedUser.email || updatedUser.username} successfully elevated to SUPERADMIN.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
