import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, createSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = await request.json()
    if (!accountId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: String(session.userId) }
    })

    const access = await prisma.accountAccess.findUnique({
      where: {
        userId_accountId: {
          userId: String(session.userId),
          accountId: accountId
        }
      }
    })

    if (!user || !access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const sessionRole = user.role === 'SUPERADMIN' ? 'SUPERADMIN' : access.role

    // Refresh the session with the new accountId
    await createSession(String(session.userId), accountId, sessionRole)

    return NextResponse.json({ success: true, accountId })
  } catch (error) {
    console.error('Error switching workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
