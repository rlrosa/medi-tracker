import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || !session.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        accountId: session.accountId as string
      },
      include: {
        medications: true
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const relationships = await prisma.medicationRelationship.findMany({
      where: {
        medicationA: { patientId: id }
      },
      include: {
        medicationA: true,
        medicationB: true
      }
    })

    return NextResponse.json({ patient, relationships })
  } catch (error) {
    console.error('Error fetching patient', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        accountId: session.accountId as string
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    await prisma.patient.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting patient', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, selfMedication } = await request.json()
    
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        accountId: session.accountId as string
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const updated = await prisma.patient.update({
      where: { id },
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
