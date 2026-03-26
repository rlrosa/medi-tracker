import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logs = await prisma.administrationLog.findMany({
      where: {
        medication: {
          patient: {
            accountId: session.accountId as string
          }
        }
      },
      take: 50,
      orderBy: { administeredAt: 'desc' },
      include: {
        medication: true,
        administeredByUser: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Failed to fetch logs:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
