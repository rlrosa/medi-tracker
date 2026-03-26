import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('📦 Starting Comprehensive Backup (8 Models)...')
  const data: any = {}
  
  const models = [
    'account',
    'user',
    'invitation',
    'patient',
    'medication',
    'administrationLog',
    'setting',
    'medicationTemplate'
  ]

  for (const model of models) {
    try {
      console.log(`📡 Fetching ${model}...`)
      // @ts-ignore
      data[model] = await prisma[model].findMany()
      console.log(`✅ Fetched ${data[model].length} rows from ${model}`)
    } catch (e: any) {
      console.error(`❌ Failed to fetch ${model}: ${e.message}`)
    }
  }

  const fileName = `dev_db_backup_${new Date().getTime()}.json`
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2))
  console.log(`🏁 Backup finished. Results saved to ${fileName}`)
}

main()
