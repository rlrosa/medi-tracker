import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

// Delete a medication
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Verify medication belongs to the account
    const medication = await prisma.medication.findFirst({
      where: {
        id,
        patient: {
          accountId: session.accountId as string
        }
      }
    })

    if (!medication) {
      return NextResponse.json({ error: 'Medication not found or unauthorized' }, { status: 404 })
    }

    await prisma.medication.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting medication', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

// Update a medication
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    // Verify medication belongs to the account
    const existing = await prisma.medication.findFirst({
      where: {
        id,
        patient: {
          accountId: session.accountId as string
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Medication not found or unauthorized' }, { status: 404 })
    }

    const data = await request.json()
    
    const medication = await prisma.medication.update({
      where: { id },
      data: {
        name: data.name,
        alias: data.alias || null,
        imageUrl: data.imageUrl || null,
        color: data.color || null,
        icon: data.icon || null,
        intervalHours: data.intervalHours ? parseInt(String(data.intervalHours), 10) : null,
        marginMinutes: data.marginMinutes !== undefined ? parseInt(String(data.marginMinutes), 10) : 30,
        daysOfWeek: data.daysOfWeek || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      }
    })

    return NextResponse.json({ medication })
  } catch (error) {
    console.error('Error updating medication', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
