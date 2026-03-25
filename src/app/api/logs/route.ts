import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const session = (await getSession()) as any
    const data = await request.json()
    
    if (!data.medicationId) {
      return NextResponse.json({ error: 'Medication ID required' }, { status: 400 })
    }

    let byUserId = session?.userId

    // If an admin requests to log it for another user
    if (session?.role === 'ADMIN' && data.administeredByUserId) {
      byUserId = data.administeredByUserId
    }

    const log = await prisma.administrationLog.create({
      data: {
        medicationId: data.medicationId,
        administeredAt: data.administeredAt ? new Date(data.administeredAt) : new Date(),
        administeredByUserId: byUserId || null,
        notes: data.notes || null
      }
    })

    return NextResponse.json({ log })
  } catch (error) {
    console.error('Error creating log', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
