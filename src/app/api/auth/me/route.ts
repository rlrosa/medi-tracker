import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ user: null })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId as string },
      select: { id: true, email: true, name: true, role: true, accountId: true, defaultMovePreference: true }
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error)
    return NextResponse.json({ user: null })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { defaultMovePreference } = await req.json()
    
    if (defaultMovePreference && !['ASK', 'SINGLE', 'OFFSET'].includes(defaultMovePreference)) {
      return NextResponse.json({ error: 'Invalid preference' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId as string },
      data: { defaultMovePreference },
      select: { id: true, defaultMovePreference: true }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user preference', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
