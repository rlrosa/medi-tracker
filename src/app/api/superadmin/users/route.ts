import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

// Middleware to check if user is superadmin
async function checkSuperAdmin() {
  const session = await getSession()
  if (!session?.userId) return null

  const user = await prisma.user.findUnique({
    where: { id: String(session.userId) }
  })

  if (user?.role !== 'SUPERADMIN') return null
  return user
}

export async function GET() {
  const admin = await checkSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'SUPERADMIN' }
      },
      include: {
        account: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await checkSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId, isApproved } = await request.json()
    if (!userId || typeof isApproved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isApproved }
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
