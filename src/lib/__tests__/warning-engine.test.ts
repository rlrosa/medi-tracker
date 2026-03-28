import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkViolations } from '../warning-engine'
import prisma from '../prisma'

// Mock prisma
vi.mock('../prisma', () => ({
  default: {
    medication: {
      findUnique: vi.fn(),
    },
    medicationEvent: {
      findMany: vi.fn(),
    },
    administrationLog: {
      findMany: vi.fn(),
    },
  },
}))

describe('Warning Engine', () => {
  const patientId = 'test-patient'
  const medicationId = 'test-med'
  const time = new Date('2026-03-27T12:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect a MIN_INTERVAL violation (previous dose)', async () => {
    const mockMedication = {
      id: medicationId,
      name: 'Test Med',
      minIntervalMinutes: 240, // 4 hours
      maxIntervalMinutes: null,
      schedules: [{ intervalHours: 6, marginMinutes: 30 }],
      relationshipsAsA: [],
      relationshipsAsB: [],
    }

    const mockPrevEvent = {
      id: 'prev-id',
      medicationId,
      time: new Date('2026-03-27T10:00:00Z'), // 2 hours before
      type: 'EVENT',
    }

    // Mock Prisma responses
    ;(prisma.medication.findUnique as any).mockResolvedValue(mockMedication)
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([mockPrevEvent])
    ;(prisma.administrationLog.findMany as any).mockResolvedValue([])

    const violations = await checkViolations(patientId, { medicationId, time })

    expect(violations).toHaveLength(1)
    expect(violations[0].type).toBe('MIN_INTERVAL')
    expect(violations[0].message).toContain('Too close to previous dose')
  })

  it('should detect a FAR_FROM violation', async () => {
    const otherMedId = 'other-med'
    const mockMedication = {
      id: medicationId,
      name: 'Med A',
      minIntervalMinutes: null,
      maxIntervalMinutes: null,
      schedules: [],
      relationshipsAsA: [{
        medicationBId: otherMedId,
        type: 'FAR_FROM',
        valueMinutes: 120, // 2 hours
        medicationB: { name: 'Med B' }
      }],
      relationshipsAsB: [],
    }

    const mockInteractingLog = {
      id: 'log-id',
      medicationId: otherMedId,
      administeredAt: new Date('2026-03-27T11:00:00Z'), // 1 hour before
    }

    // Mock Prisma responses
    ;(prisma.medication.findUnique as any).mockResolvedValue(mockMedication)
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([])
    ;(prisma.administrationLog.findMany as any).mockResolvedValue([mockInteractingLog])

    const violations = await checkViolations(patientId, { medicationId, time })

    expect(violations).toHaveLength(1)
    expect(violations[0].type).toBe('FAR_FROM')
    expect(violations[0].message).toContain('at least 120m away from Med B')
  })

  it('should detect a NEAR_TO violation', async () => {
    const otherMedId = 'other-med'
    const mockMedication = {
      id: medicationId,
      name: 'Med A',
      minIntervalMinutes: null,
      maxIntervalMinutes: null,
      schedules: [],
      relationshipsAsA: [{
        medicationBId: otherMedId,
        type: 'NEAR_TO',
        valueMinutes: 60, // 1 hour
        medicationB: { name: 'Med B' }
      }],
      relationshipsAsB: [],
    }

    const mockInteractingLog = {
      id: 'log-id',
      medicationId: otherMedId,
      administeredAt: new Date('2026-03-27T10:00:00Z'), // 2 hours before
    }

    // Mock Prisma responses
    ;(prisma.medication.findUnique as any).mockResolvedValue(mockMedication)
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([])
    ;(prisma.administrationLog.findMany as any).mockResolvedValue([mockInteractingLog])

    const violations = await checkViolations(patientId, { medicationId, time })

    expect(violations).toHaveLength(1)
    expect(violations[0].type).toBe('NEAR_TO')
    expect(violations[0].message).toContain('within 60m of Med B')
  })

  it('should return no violations for a valid administration', async () => {
    const mockMedication = {
      id: medicationId,
      name: 'Test Med',
      minIntervalMinutes: 60,
      maxIntervalMinutes: null,
      schedules: [],
      relationshipsAsA: [],
      relationshipsAsB: [],
    }

    const mockPrevEvent = {
      id: 'prev-id',
      medicationId,
      time: new Date('2026-03-27T08:00:00Z'), // 4 hours before
    }

    // Mock Prisma responses
    ;(prisma.medication.findUnique as any).mockResolvedValue(mockMedication)
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([mockPrevEvent])
    ;(prisma.administrationLog.findMany as any).mockResolvedValue([])

    const violations = await checkViolations(patientId, { medicationId, time })

    expect(violations).toHaveLength(0)
  })

  it('should detect bidirectional FAR_FROM violation (target is relationship B)', async () => {
    const otherMedId = 'other-med'
    const mockMedication = {
      id: medicationId,
      name: 'Med B',
      minIntervalMinutes: null,
      maxIntervalMinutes: null,
      schedules: [],
      relationshipsAsA: [],
      relationshipsAsB: [{
        medicationAId: otherMedId,
        type: 'FAR_FROM',
        valueMinutes: 120, // 2 hours
        medicationA: { name: 'Med A' }
      }],
    }

    const mockInteractingLog = {
      id: 'log-id',
      medicationId: otherMedId,
      administeredAt: new Date('2026-03-27T11:00:00Z'), // 1 hour before
    }

    // Mock Prisma responses
    ;(prisma.medication.findUnique as any).mockResolvedValue(mockMedication)
    ;(prisma.medicationEvent.findMany as any).mockResolvedValue([])
    ;(prisma.administrationLog.findMany as any).mockResolvedValue([mockInteractingLog])

    const violations = await checkViolations(patientId, { medicationId, time })

    expect(violations).toHaveLength(1)
    expect(violations[0].type).toBe('FAR_FROM')
    expect(violations[0].message).toContain('Med A must be at least 120m away from Med B')
  })
})
