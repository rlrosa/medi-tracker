import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const medName = url.searchParams.get('name')
  const dateStr = url.searchParams.get('date')
  const userId = url.searchParams.get('user')

  const whereClause: any = {}

  if (medName) {
    whereClause.medication = { name: { contains: medName, mode: 'insensitive' } }
  }
  
  if (userId) {
    whereClause.administeredByUserId = userId
  }

  if (dateStr) {
    // dateStr in YYYY-MM-DD format
    const start = new Date(dateStr)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateStr)
    end.setHours(23, 59, 59, 999)
    whereClause.administeredAt = { gte: start, lte: end }
  }

  try {
    const logs = await prisma.administrationLog.findMany({
      where: whereClause,
      orderBy: { administeredAt: 'desc' },
      include: {
        medication: { select: { name: true, alias: true } },
        administeredByUser: { select: { id: true, name: true, username: true } }
      }
    })
    return NextResponse.json({ logs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
