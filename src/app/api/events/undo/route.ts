import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { undoLastAction } from '@/lib/events-manager'

export async function POST() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await undoLastAction(session.userId)

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        actionType: result.actionType,
        undoStackCount: result.undoStackCount,
        nextActionDescription: result.nextActionDescription
      })
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in undo API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
