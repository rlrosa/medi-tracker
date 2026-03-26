import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

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
        schedules: { orderBy: { createdAt: 'asc' } }
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

    const medication = await prisma.medication.create({
      data: {
        name: data.name,
        alias: data.alias || null,
        imageUrl: data.imageUrl || null,
        patientId: data.patientId,
        schedules: {
          create: {
            name: 'Primary Schedule',
            intervalHours: data.intervalHours ? parseInt(String(data.intervalHours), 10) : null,
            daysOfWeek: data.daysOfWeek || null,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            marginMinutes: data.marginMinutes ? parseInt(String(data.marginMinutes), 10) : 30,
            color: data.color || null,
            icon: data.icon || null
          }
        }
      },
      include: { schedules: true }
    })

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error creating medication', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
