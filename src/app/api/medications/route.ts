import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { syncScheduleEvents } from '@/lib/events-manager'

// List all medications for the account
export async function GET() {
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const medications = await prisma.medication.findMany({
      where: {
        patient: {
          accountId: session.accountId as string
        }
      },
      include: { 
        patient: true,
        schedules: { orderBy: { createdAt: 'asc' } },
        _count: { select: { logs: true } }
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ medications })
  } catch (err) {
    console.error('Error fetching medications', err)
    return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 })
  }
}

// Add new medication
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    if (!data.name || !data.patientId) {
      return NextResponse.json({ error: 'Name and Patient ID are required' }, { status: 400 })
    }

    // Verify patient belongs to the account
    const patient = await prisma.patient.findFirst({
      where: {
        id: data.patientId,
        accountId: session.accountId as string
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Invalid Patient ID' }, { status: 400 })
    }

    const schedules = data.schedules && Array.isArray(data.schedules) ? data.schedules : [{
      name: data.scheduleName || 'Primary Schedule',
      intervalHours: data.intervalHours ? parseInt(String(data.intervalHours), 10) : null,
      daysOfWeek: data.daysOfWeek || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      marginMinutes: data.marginMinutes ? parseInt(String(data.marginMinutes), 10) : 30,
      color: data.color || null,
      icon: data.icon || null
    }]

    const medication = await prisma.medication.create({
      data: {
        name: data.name,
        alias: data.alias || null,
        imageUrl: data.imageUrl || null,
        patientId: data.patientId,
        minIntervalMinutes: data.minIntervalMinutes || null,
        maxIntervalMinutes: data.maxIntervalMinutes || null,
        schedules: {
          create: schedules.map((s: any) => ({
            name: s.name || 'Schedule',
            intervalHours: s.intervalHours ? parseInt(String(s.intervalHours), 10) : null,
            daysOfWeek: s.daysOfWeek || null,
            startDate: s.startDate ? new Date(s.startDate) : null,
            endDate: s.endDate ? new Date(s.endDate) : null,
            marginMinutes: s.marginMinutes ? parseInt(String(s.marginMinutes), 10) : 30,
            color: s.color || data.color || null,
            icon: s.icon || data.icon || null
          }))
        }
      },
      include: { schedules: true }
    })

    for (const schedule of medication.schedules) {
      await syncScheduleEvents(schedule.id, { forceRegenerate: true })
    }

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error creating medication', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
