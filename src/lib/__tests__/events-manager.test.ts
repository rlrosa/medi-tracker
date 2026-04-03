import { describe, it, expect, vi, beforeEach } from 'vitest'
import { undoLastAction } from '../events-manager'
import prisma from '../prisma'

vi.mock('../prisma', () => ({
  default: {
    medicationEventHistory: {
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    medicationEvent: {
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn()
    },
    medicationSchedule: {
      update: vi.fn()
    }
  }
}))

describe('Events Manager Undo/Redo - BULK_DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should correctly restore multiple events using createMany', async () => {
    const event1 = {
      id: 'e1',
      scheduleId: 's1',
      medicationId: 'm1',
      time: '2026-03-27T08:00:00Z',
      status: 'PENDING'
    }
    const event2 = {
      id: 'e2',
      scheduleId: 's1',
      medicationId: 'm1',
      time: '2026-03-27T12:00:00Z',
      status: 'PENDING'
    }

    const undoData = {
      mode: 'RESTORE',
      scheduleId: 's1',
      events: [event1, event2]
    }

    ;(prisma.medicationEventHistory.findFirst as any).mockResolvedValue({
      id: 'h1',
      actionType: 'BULK_DELETE',
      undoData: JSON.stringify(undoData),
      isUndone: false
    })

    await undoLastAction('user1')

    // Verify createMany was called with correctly formatted data
    expect(prisma.medicationEvent.createMany).toHaveBeenCalledWith({
      data: [
        {
          ...event1,
          time: new Date(event1.time),
          originalTime: null
        },
        {
          ...event2,
          time: new Date(event2.time),
          originalTime: null
        }
      ]
    })

    // Verify schedule endDate was cleared
    expect(prisma.medicationSchedule.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { endDate: null }
    })

    // Verify history record was updated
    expect(prisma.medicationEventHistory.update).toHaveBeenCalledWith({
      where: { id: 'h1' },
      data: { isUndone: true }
    })
  })
})
