import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        id: params.id,
        accountId: session.accountId as string
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    await prisma.patient.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting patient', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, selfMedication } = await request.json()
    
    const patient = await prisma.patient.findFirst({
      where: {
        id: params.id,
        accountId: session.accountId as string
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const updated = await prisma.patient.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : undefined,
        selfMedication: selfMedication !== undefined ? !!selfMedication : undefined
      }
    })

    return NextResponse.json({ patient: updated })
  } catch (error) {
    console.error('Error updating patient', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
