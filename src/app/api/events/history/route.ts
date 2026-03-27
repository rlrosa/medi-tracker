import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getHistoryCount } from '@/lib/events-manager'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ count: 0, lastDescription: null })
    }

    const result = await getHistoryCount(session.userId as string)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching history count:', error)
    return NextResponse.json({ count: 0, lastDescription: null })
  }
}
