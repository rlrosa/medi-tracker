import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

// List all medications
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const medications = await prisma.medication.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ medications })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 })
  }
}

// Add new medication
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await request.json()
    
    // basic validation
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const medication = await prisma.medication.create({
      data: {
        name: data.name,
        alias: data.alias || null,
        imageUrl: data.imageUrl || null,
        intervalHours: data.intervalHours ? parseInt(data.intervalHours, 10) : null,
        daysOfWeek: data.daysOfWeek || null, // e.g., '1,3,5'
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      }
    })

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error creating medication', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
