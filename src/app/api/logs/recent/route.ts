import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Return the 50 most recent logs
    const logs = await prisma.administrationLog.findMany({
      take: 50,
      orderBy: { administeredAt: 'desc' },
      include: {
        medication: true,
        administeredByUser: {
          select: { name: true, username: true }
        }
      }
    })

    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
