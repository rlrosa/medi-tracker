import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request, context: any) {
  const params = await context.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const log = await prisma.administrationLog.findUnique({
      where: { id: params.id },
      include: {
        medication: { select: { name: true } },
        administeredByUser: { select: { id: true, name: true, username: true } }
      }
    })
    
    if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    return NextResponse.json({ log })
  } catch(e) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}

export async function PUT(request: Request, context: any) {
  const params = await context.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.administrationLog.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.administeredByUserId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. You can only edit your own logs.' }, { status: 403 })
    }

    const { administeredAt, notes } = await request.json()
    const updated = await prisma.administrationLog.update({
      where: { id: params.id },
      data: {
        administeredAt: administeredAt ? new Date(administeredAt) : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    })

    return NextResponse.json({ log: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: any) {
  const params = await context.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.administrationLog.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.administeredByUserId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. You can only delete your own logs.' }, { status: 403 })
    }

    await prisma.administrationLog.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
