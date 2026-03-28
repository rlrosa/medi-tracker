import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: patientId } = await params
  
  try {
    const data = await request.json()
    const { medicationAId, medicationBId, type, valueMinutes } = data

    if (!medicationAId || !medicationBId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (medicationAId === medicationBId) {
      return NextResponse.json({ error: 'Medications must be different' }, { status: 400 })
    }

    // Verify both medications belong to the patient
    const [medA, medB] = await Promise.all([
      prisma.medication.findFirst({
        where: { id: medicationAId, patientId, patient: { accountId: session.accountId as string } }
      }),
      prisma.medication.findFirst({
        where: { id: medicationBId, patientId, patient: { accountId: session.accountId as string } }
      })
    ])

    if (!medA || !medB) {
      return NextResponse.json({ error: 'Invalid medications or unauthorized' }, { status: 404 })
    }

    // create relationship
    const relationship = await prisma.medicationRelationship.create({
      data: {
        medicationAId,
        medicationBId,
        type,
        valueMinutes: valueMinutes ? parseInt(valueMinutes, 10) : null,
      }
    })

    return NextResponse.json({ relationship })
  } catch (error) {
    console.error('Error creating relationship', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
