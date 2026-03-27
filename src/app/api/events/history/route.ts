import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getHistoryStatus } from '@/lib/events-manager'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, undoCount: 0, redoCount: 0 })
    }

    const status = await getHistoryStatus(session.userId as string)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching history status:', error)
    return NextResponse.json({ success: false, undoCount: 0, redoCount: 0 })
  }
}
