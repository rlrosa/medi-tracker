import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const medName = url.searchParams.get('name')
  const dateStr = url.searchParams.get('date')
  const userId = url.searchParams.get('user')

  const whereClause: any = {
    medication: {
      patient: {
        accountId: session.accountId as string
      }
    }
  }

  if (medName) {
    whereClause.medication.name = { contains: medName, mode: 'insensitive' }
  }
  
  if (userId) {
    whereClause.administeredByUserId = userId
  }

  if (dateStr) {
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
        administeredByUser: { select: { id: true, name: true, email: true } }
      }
    })
    return NextResponse.json({ logs })
  } catch (err) {
    console.error('Error fetching logs', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await request.json()
    const { medicationId, administeredAt, notes, administeredByUserId, scheduledAt, scheduleId, status } = data
    
    // Verify medication belongs to the account
    const medication = await prisma.medication.findFirst({
      where: {
        id: String(medicationId),
        patient: {
          accountId: session.accountId as string
        }
      }
    })

    if (!medication) {
      return NextResponse.json({ error: 'Invalid Medication ID' }, { status: 400 })
    }

    let finalUserId: string = String(session.userId)
    if (session.role === 'ADMIN' && typeof administeredByUserId === 'string' && administeredByUserId) {
      finalUserId = administeredByUserId
    }

    const log = await prisma.administrationLog.create({
      data: {
        medicationId: String(medicationId),
        scheduleId: scheduleId ? String(scheduleId) : null,
        status: status === 'SKIPPED' ? 'SKIPPED' : 'ADMINISTERED',
        administeredAt: new Date(String(administeredAt)),
        scheduledAt: scheduledAt ? new Date(String(scheduledAt)) : null,
        administeredByUserId: finalUserId,
        notes: typeof notes === 'string' && notes ? notes : null
      }
    })

    return NextResponse.json({ log })
  } catch (error) {
    console.error('Error creating log', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
