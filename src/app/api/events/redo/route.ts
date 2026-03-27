import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { redoLastAction } from '@/lib/events-manager'

export async function POST() {
  try {
    const session = await getSession() as { userId: string } | null
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await redoLastAction(session.userId)

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json({ error: (result as any).message }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in redo API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
