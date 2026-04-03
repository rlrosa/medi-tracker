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
      createMany: vi.fn()
    },
    medicationSchedule: {
      update: vi.fn()
    }
  }
}))

describe('BULK_DELETE Restore Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call medicationEvent.createMany once for N events in RESTORE mode (Optimized)', async () => {
    const N = 100;
    const events = Array.from({ length: N }, (_, i) => ({
      id: `event-${i}`,
      scheduleId: 'sched-1',
      medicationId: 'med-1',
      time: new Date().toISOString(),
      originalTime: new Date().toISOString(),
      status: 'PENDING'
    }));

    const undoData = {
      mode: 'RESTORE',
      scheduleId: 'sched-1',
      events: events
    };

    (prisma.medicationEventHistory.findFirst as any).mockResolvedValue({
      id: 'history-1',
      actionType: 'BULK_DELETE',
      undoData: JSON.stringify(undoData),
      isUndone: false
    });

    (prisma.medicationEventHistory.count as any).mockResolvedValue(0);
    (prisma.medicationEventHistory.update as any).mockResolvedValue({});
    (prisma.medicationSchedule.update as any).mockResolvedValue({});
    (prisma.medicationEvent.createMany as any).mockResolvedValue({ count: N });

    const start = performance.now();
    await undoLastAction('user-1');
    const end = performance.now();

    expect(prisma.medicationEvent.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.medicationEvent.create).toHaveBeenCalledTimes(0);
    console.log(`Optimized: Restoring ${N} events took ${(end - start).toFixed(4)}ms and made 1 createMany call.`);
  })
})
