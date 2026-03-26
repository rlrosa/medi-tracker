import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || !session.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const patients = await prisma.patient.findMany({
      where: { accountId: session.accountId as string },
      include: { 
        user: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Error fetching patients', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, selfMedication } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        selfMedication: !!selfMedication,
        accountId: session.accountId as string,
        // If self-medication is checked, we can link it to the creator if they are the admin
        // or just link it if we want to track who is who.
        userId: !!selfMedication ? session.userId as string : null
      }
    })

    return NextResponse.json({ patient })
  } catch (error) {
    console.error('Error creating patient', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
