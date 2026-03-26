import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function dumpTable(modelName: string) {
  try {
    console.log(`📡 Fetching ${modelName}...`)
    // @ts-ignore - Dynamic access to prisma models
    const data = await prisma[modelName].findMany()
    return data
  } catch (error) {
    console.warn(`⚠️ Table ${modelName} not found or inaccessible. Skipping.`)
    return null
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `db_backup_minimal_${timestamp}.json`
  const filePath = path.join(process.cwd(), fileName)

  console.log('🚀 Starting Resilient Node-based Database Dump...')

  const data: any = {}
  
  // Potential models in various schema versions
  const models = [
    'account',
    'user',
    'invitation',
    'patient',
    'medication',
    'administrationLog',
    'setting',
    'medicationTemplate',
    'medicationSchedule'
  ]

  try {
    for (const model of models) {
      const tableData = await dumpTable(model)
      if (tableData !== null) {
        data[model] = tableData
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`✅ Success! Data dumped to ${fileName}`)
    console.log(`📦 Found tables: ${Object.keys(data).join(', ')}`)
    console.log(`📊 Total entries: ${Object.values(data).flat().length}`)
  } catch (error) {
    console.error('❌ Dump failed catastrophically:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
