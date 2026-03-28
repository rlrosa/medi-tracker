import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  
  try {
    const relationship = await prisma.medicationRelationship.findUnique({
      where: { id },
      include: { 
        medicationA: { include: { patient: true } },
        medicationB: { include: { patient: true } }
      }
    })

    const isAuthorized = relationship && (
      relationship.medicationA.patient?.accountId === session.accountId ||
      relationship.medicationB.patient?.accountId === session.accountId
    )

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Relationship not found or unauthorized' }, { status: 404 })
    }

    await prisma.medicationRelationship.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting relationship', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
