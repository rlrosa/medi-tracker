import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accesses = await prisma.accountAccess.findMany({
      where: { userId: session.userId },
      include: {
        account: true
      }
    })

    const workspaces = accesses.map(access => ({
      id: access.account.id,
      name: access.account.name,
      type: access.account.type,
      role: access.role
    }))

    return NextResponse.json(workspaces)
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
