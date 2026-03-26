import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📋 Listing all tables in the database...')
  try {
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `
    console.log('Tables found:')
    console.table(tables)
  } catch (error) {
    console.error('❌ Failed to list tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
