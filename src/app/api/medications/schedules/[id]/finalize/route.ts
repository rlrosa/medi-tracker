import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.accountId || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify schedule belongs to the account via medication -> patient
    const schedule = await prisma.medicationSchedule.findFirst({
      where: {
        id,
        medication: {
          patient: {
            accountId: session.accountId as string
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found or unauthorized' }, { status: 404 })
    }

    // Set end date to now
    const now = new Date()
    await prisma.medicationSchedule.update({
      where: { id },
      data: { endDate: now }
    })

    return NextResponse.json({ success: true, endDate: now.toISOString() })
  } catch (error) {
    console.error('Error finalizing schedule', error)
    return NextResponse.json({ error: 'Failed to finalize schedule' }, { status: 500 })
  }
}
