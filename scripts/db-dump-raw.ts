import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `db_backup_final_${timestamp}.json`
  const filePath = path.join(process.cwd(), fileName)

  console.log('🚀 Starting Robust Raw SQL Database Dump...')

  const data: any = {}
  
  try {
    const tableInfo: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    const tables = tableInfo.map(t => t.table_name)
    console.log(`🔍 Detected tables: ${tables.join(', ')}`)

    for (const table of tables) {
      console.log(`📡 Dumping table: ${table}...`)
      let rows: any[] = []
      try {
        // Try with quotes (case-sensitive)
        rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`)
      } catch (e) {
        // Try without quotes (lowercase fallback)
        console.log(`  Manual fetch for ${table} failed with quotes, trying lowercase...`)
        rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${table.toLowerCase()}`)
      }
      data[table] = rows
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`✅ Success! Data dumped to ${fileName}`)
    console.log(`📊 Total tables: ${Object.keys(data).length}`)
    console.log(`📈 Total rows: ${Object.values(data).flat().length}`)
  } catch (error) {
    console.error('❌ Dump failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
