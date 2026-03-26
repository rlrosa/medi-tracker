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
      select: { id: true, email: true, name: true, role: true, accountId: true }
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ user: null })
  }
}
