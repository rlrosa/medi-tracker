import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '@/app/api/medications/[id]/route'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

vi.mock('@/lib/events-manager', () => ({
  syncScheduleEvents: vi.fn().mockResolvedValue(true)
}))

// Mock prisma and session
vi.mock('@/lib/prisma', () => ({
  default: {
    medication: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    administrationLog: {
      updateMany: vi.fn(),
    },
    medicationSchedule: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'upd-sched-id' }),
      create: vi.fn().mockResolvedValue({ id: 'new-sched-id' }),
    },
    medicationEvent: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    }
  },
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

describe('Medication Schedule Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSession as any).mockResolvedValue({ accountId: 'mock-account', role: 'ADMIN' })
    ;(prisma.medication.findFirst as any).mockResolvedValue({ id: 'med-1' })
    ;(prisma.medicationSchedule.findMany as any).mockResolvedValue([
      { id: 'sched-1' },
      { id: 'sched-to-delete' }
    ])
    ;(prisma.medication.update as any).mockResolvedValue({ id: 'med-1' })
  })

  it('should detach logs (set scheduleId and eventId to null) for schedules that are being deleted', async () => {
    const payload = {
      name: 'Test Med',
      patientId: 'patient-1',
      schedules: [
        { id: 'sched-1', name: 'Kept Schedule', intervalHours: 12, startDate: new Date().toISOString() },
        { id: 'new-sched', name: 'New Schedule', intervalHours: 8, startDate: new Date().toISOString() }
      ]
    }

    const req = new Request('http://localhost/api/medications/med-1', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })

    const res = await PUT(req, { params: Promise.resolve({ id: 'med-1' }) })
    expect(res.status).toBe(200)

    // Verify updateMany was called with the correct unlinking payload
    expect(prisma.administrationLog.updateMany).toHaveBeenCalledWith({
      where: {
        medicationId: 'med-1',
        // sched-to-delete was removed from payload, so the ones "kept" didn't include it. 
        scheduleId: { notIn: ['sched-1', 'new-sched'] }
      },
      data: {
        scheduleId: null,
        eventId: null
      }
    })

    // Verify medication update deleted the removed schedule
    expect(prisma.medicationSchedule.deleteMany).toHaveBeenCalledWith({
      where: {
        medicationId: 'med-1',
        id: { notIn: ['sched-1', 'new-sched'] }
      }
    })
  })

  it('should not throw or fail if there are no schedules to keep', async () => {
    const payload = {
      name: 'Test Med',
      patientId: 'patient-1',
      schedules: []
    }

    const req = new Request('http://localhost/api/medications/med-1', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })

    const res = await PUT(req, { params: Promise.resolve({ id: 'med-1' }) })
    expect(res.status).toBe(200)

    expect(prisma.administrationLog.updateMany).toHaveBeenCalledWith({
      where: {
        medicationId: 'med-1',
        scheduleId: { notIn: [] } // Detaches ALL
      },
      data: {
        scheduleId: null,
        eventId: null
      }
    })
  })
})
