import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const log = await prisma.administrationLog.findFirst({
      where: { 
        id: id,
        medication: {
          patient: {
            accountId: session.accountId as string
          }
        }
      },
      include: {
        medication: { select: { name: true } },
        administeredByUser: { select: { id: true, name: true, email: true } }
      }
    })
    
    if (!log) return NextResponse.json({ error: 'Log not found or unauthorized' }, { status: 404 })
    return NextResponse.json({ log })
  } catch(e) {
    console.error('Error fetching log', e)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.administrationLog.findFirst({ 
      where: { 
        id: id,
        medication: {
          patient: {
            accountId: session.accountId as string
          }
        }
      } 
    })
    if (!existing) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

    if (existing.administeredByUserId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. You can only edit your own logs.' }, { status: 403 })
    }

    const { administeredAt, notes } = await request.json()
    const updated = await prisma.administrationLog.update({
      where: { id: id },
      data: {
        administeredAt: administeredAt ? new Date(administeredAt) : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    })

    return NextResponse.json({ log: updated })
  } catch (error) {
    console.error('Error updating log', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.administrationLog.findFirst({ 
      where: { 
        id: id,
        medication: {
          patient: {
            accountId: session.accountId as string
          }
        }
      } 
    })
    if (!existing) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

    if (existing.administeredByUserId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. You can only delete your own logs.' }, { status: 403 })
    }

    await prisma.administrationLog.delete({ where: { id: id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting log', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
