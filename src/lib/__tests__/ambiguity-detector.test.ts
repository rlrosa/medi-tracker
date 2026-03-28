import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateAmbiguity, resolveAndAutoSkip } from '../ambiguity-detector'
import prisma from '../prisma'

vi.mock('../prisma', () => ({
  default: {
    medicationEvent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn()
    }
  }
}))

describe('Ambiguity Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should auto-link to past event if administered before 50% midpoint', async () => {
    const past = new Date('2026-03-27T02:00:00Z') // 2:00 AM
    const future = new Date('2026-03-27T06:00:00Z') // 6:00 AM
    
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([
      { id: '2am-id', time: past },
      { id: '6am-id', time: future }
    ])

    const administeredAt = new Date('2026-03-27T02:15:00Z') // 2:15 AM
    const result = await evaluateAmbiguity('med1', administeredAt, 'sched1')

    expect(result.isAmbiguous).toBe(false)
    expect(result.selectedEventId).toBe('2am-id')
  })

  it('should be ambiguous if administered after 50% midpoint', async () => {
    const past = new Date('2026-03-27T02:00:00Z') // 2:00 AM
    const future = new Date('2026-03-27T06:00:00Z') // 6:00 AM
    
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([
      { id: '2am-id', time: past },
      { id: '6am-id', time: future }
    ])

    const administeredAt = new Date('2026-03-27T04:30:00Z') // 4:30 AM
    const result = await evaluateAmbiguity('med1', administeredAt, 'sched1')

    expect(result.isAmbiguous).toBe(true)
    expect(result.pastEvent?.id).toBe('2am-id')
    expect(result.futureEvent?.id).toBe('6am-id')
  })

  it('should auto-link if no future event exists', async () => {
    const past = new Date('2026-03-27T02:00:00Z') // 2:00 AM
    
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([
      { id: '2am-id', time: past }
    ])

    const administeredAt = new Date('2026-03-27T04:30:00Z') // 4:30 AM
    const result = await evaluateAmbiguity('med1', administeredAt, 'sched1')

    expect(result.isAmbiguous).toBe(false)
    expect(result.selectedEventId).toBe('2am-id')
  })

  it('should resolve and auto-skip prior pending events', async () => {
    const targetEventTime = new Date('2026-03-27T06:00:00Z') // 6:00 AM
    
    ;(prisma.medicationEvent.findUnique as any).mockResolvedValue({
      originalTime: targetEventTime,
      time: targetEventTime
    })

    await resolveAndAutoSkip('med1', '6am-id', 'sched1')

    expect(prisma.medicationEvent.updateMany).toHaveBeenCalledWith({
      where: {
        scheduleId: 'sched1',
        status: 'PENDING',
        originalTime: {
          lt: targetEventTime
        }
      },
      data: {
        status: 'SKIPPED'
      }
    })
  })
})
