import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session || !session.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id: session.accountId as string },
      include: {
        patients: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error fetching account details', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
