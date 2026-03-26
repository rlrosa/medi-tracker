import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || !session.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      where: { accountId: session.accountId as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
