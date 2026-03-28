import prisma from './prisma'

export interface Violation {
  type: 'MIN_INTERVAL' | 'MAX_INTERVAL' | 'FAR_FROM' | 'NEAR_TO'
  medicationAId: string
  medicationBId?: string
  message: string
  severity: 'WARNING'
  interactingEventId?: string
  eventB?: { name: string; time: Date }
}

export async function checkViolations(
  patientId: string,
  targetEvent: { medicationId: string; time: Date; id?: string },
  bufferHours: number = 48
): Promise<Violation[]> {
  const violations: Violation[] = []
  
  // 1. Fetch the medication and its schedules to get frequency/margin
  const medication = await prisma.medication.findUnique({
    where: { id: targetEvent.medicationId },
    include: {
      schedules: true,
      relationshipsAsA: { include: { medicationB: true } },
      relationshipsAsB: { include: { medicationA: true } }
    }
  })

  if (!medication) {
    console.log(`[WarningEngine] Medication not found: ${targetEvent.medicationId}`)
    return []
  }

  console.log(`[WarningEngine] Checking violations for: ${medication.name}`, {
    hasSchedules: !!medication.schedules?.length,
    hasRelA: !!medication.relationshipsAsA?.length,
    hasRelB: !!medication.relationshipsAsB?.length
  })

  // Derived Constraints
  const schedule = medication.schedules[0] // Assuming primary schedule for now
  const intervalMinutes = (schedule?.intervalHours || 0) * 60
  const marginMinutes = schedule?.marginMinutes || 30
  
  const effectiveMinInterval = medication.minIntervalMinutes ?? 
    (intervalMinutes > 0 ? Math.max(marginMinutes, intervalMinutes * 0.9) : marginMinutes)
    
  const effectiveMaxInterval = medication.maxIntervalMinutes ?? 
    (intervalMinutes > 0 ? intervalMinutes * 1.1 : null)

  // 2. Fetch all events/logs for this patient within the buffer window
  const windowStart = new Date(targetEvent.time.getTime() - bufferHours * 60 * 60 * 1000)
  const windowEnd = new Date(targetEvent.time.getTime() + bufferHours * 60 * 60 * 1000)

  const [events, logs] = await Promise.all([
    prisma.medicationEvent.findMany({
      where: {
        medication: { patientId },
        time: { gte: windowStart, lte: windowEnd },
        NOT: targetEvent.id ? { id: targetEvent.id } : undefined
      }
    }),
    prisma.administrationLog.findMany({
      where: {
        medication: { patientId },
        administeredAt: { gte: windowStart, lte: windowEnd }
      }
    })
  ])

  // Combine and sort all instances (past administrations and future scheduled events)
  const instances = [
    ...events.map(e => ({ id: e.id, medicationId: e.medicationId, time: e.time, type: 'EVENT' })),
    ...logs.map(l => ({ id: l.id, medicationId: l.medicationId, time: l.administeredAt, type: 'LOG' }))
  ].sort((a, b) => a.time.getTime() - b.time.getTime())

  // --- INTERNAL CHECKS (Same Medication) ---
  const sameMedInstances = instances.filter(i => i.medicationId === targetEvent.medicationId)
  
  // Check closest PREVIOUS instance
  const prev = [...sameMedInstances].reverse().find(i => i.time < targetEvent.time)
  if (prev) {
    const diff = (targetEvent.time.getTime() - prev.time.getTime()) / (1000 * 60)
    if (diff < effectiveMinInterval) {
      violations.push({
        type: 'MIN_INTERVAL',
        medicationAId: medication.id,
        message: `Too close to previous dose. Minimum interval is ${effectiveMinInterval}m, but found ${Math.round(diff)}m.`,
        severity: 'WARNING',
        interactingEventId: prev.id
      })
    }
  }

  // Check closest NEXT instance
  const next = sameMedInstances.find(i => i.time > targetEvent.time)
  if (next) {
    const diff = (next.time.getTime() - targetEvent.time.getTime()) / (1000 * 60)
    if (diff < effectiveMinInterval) {
      violations.push({
        type: 'MIN_INTERVAL',
        medicationAId: medication.id,
        message: `Too close to next scheduled dose. Minimum interval is ${effectiveMinInterval}m, but found ${Math.round(diff)}m.`,
        severity: 'WARNING',
        interactingEventId: next.id
      })
    }
  }

  // Medication A is "target", check if any Relationship exists where Medication A is constrained by Medication B
  for (const rel of medication.relationshipsAsA) {
    const otherMedInstances = instances.filter(i => i.medicationId === rel.medicationBId)
    
    if (rel.type === 'FAR_FROM') {
      const minVal = rel.valueMinutes || effectiveMinInterval
      for (const other of otherMedInstances) {
        const diff = Math.abs(targetEvent.time.getTime() - other.time.getTime()) / (1000 * 60)
        if (diff < minVal) {
          violations.push({
            type: 'FAR_FROM',
            medicationAId: medication.id,
            medicationBId: rel.medicationBId,
            message: `${medication.name} must be at least ${minVal}m away from ${rel.medicationB.name || 'other medication'}. Current gap: ${Math.round(diff)}m.`,
            severity: 'WARNING',
            interactingEventId: other.id,
            eventB: { name: rel.medicationB.name || 'Other', time: other.time }
          })
        }
      }
    }
    
    if (rel.type === 'NEAR_TO') {
      const maxVal = rel.valueMinutes || effectiveMaxInterval
      if (maxVal) {
        const closest = otherMedInstances.reduce((prevVal: any, curr) => {
          const currDiff = Math.abs(targetEvent.time.getTime() - curr.time.getTime())
          const prevDiff = prevVal ? Math.abs(targetEvent.time.getTime() - prevVal.time.getTime()) : Infinity
          return currDiff < prevDiff ? curr : prevVal
        }, null)
        
        if (closest) {
          const diff = Math.abs(targetEvent.time.getTime() - closest.time.getTime()) / (1000 * 60)
          if (diff > maxVal) {
            violations.push({
              type: 'NEAR_TO',
              medicationAId: medication.id,
              medicationBId: rel.medicationBId,
              message: `${medication.name} must be within ${maxVal}m of ${rel.medicationB.name || 'other medication'}. Current gap: ${Math.round(diff)}m.`,
              severity: 'WARNING',
              interactingEventId: closest.id,
              eventB: { name: rel.medicationB.name || 'Other', time: closest.time }
            })
          }
        }
      }
    }
  }

  // Medication B is "target", check if any Relationship exists where Medication A is constrained by US (Medication B)
  for (const rel of medication.relationshipsAsB) {
    const otherMedInstances = instances.filter(i => i.medicationId === rel.medicationAId)
    
    if (rel.type === 'FAR_FROM') {
      const minVal = rel.valueMinutes || effectiveMinInterval
      for (const other of otherMedInstances) {
        const diff = Math.abs(targetEvent.time.getTime() - other.time.getTime()) / (1000 * 60)
        if (diff < minVal) {
          violations.push({
            type: 'FAR_FROM',
            medicationAId: rel.medicationAId,
            medicationBId: medication.id,
            message: `${rel.medicationA.name} must be at least ${minVal}m away from ${medication.name}. Current gap: ${Math.round(diff)}m.`,
            severity: 'WARNING',
            interactingEventId: other.id,
            eventB: { name: rel.medicationA.name || 'Other', time: other.time }
          })
        }
      }
    }
    
    if (rel.type === 'NEAR_TO') {
      const maxVal = rel.valueMinutes || effectiveMaxInterval
      if (maxVal) {
        const closest = otherMedInstances.reduce((prevVal: any, curr) => {
          const currDiff = Math.abs(targetEvent.time.getTime() - curr.time.getTime())
          const prevDiff = prevVal ? Math.abs(targetEvent.time.getTime() - prevVal.time.getTime()) : Infinity
          return currDiff < prevDiff ? curr : prevVal
        }, null)
        
        if (closest) {
          const diff = Math.abs(targetEvent.time.getTime() - closest.time.getTime()) / (1000 * 60)
          if (diff > maxVal) {
            violations.push({
              type: 'NEAR_TO',
              medicationAId: rel.medicationAId,
              medicationBId: medication.id,
              message: `${rel.medicationA.name} must be within ${maxVal}m of ${medication.name}. Current gap: ${Math.round(diff)}m.`,
              severity: 'WARNING',
              interactingEventId: closest.id,
              eventB: { name: rel.medicationA.name || 'Other', time: closest.time }
            })
          }
        }
      }
    }
  }

  return violations
}
