import prisma from './prisma'

export interface AmbiguityResult {
  isAmbiguous: boolean;
  pastEvent?: { id: string, time: Date };
  futureEvent?: { id: string, time: Date };
  selectedEventId?: string; 
}

export async function evaluateAmbiguity(
  medicationId: string, 
  administeredAt: Date, 
  scheduleId?: string | null
): Promise<AmbiguityResult> {
  const whereClause: any = {
    medicationId,
    status: 'PENDING'
  };
  if (scheduleId) {
     whereClause.scheduleId = scheduleId
  }

  const pendingEvents = await prisma.medicationEvent.findMany({
    where: whereClause,
    orderBy: { time: 'asc' },
    select: { id: true, time: true }
  });

  if (pendingEvents.length === 0) {
    return { isAmbiguous: false };
  }

  const pastEvents = pendingEvents.filter(e => e.time.getTime() <= administeredAt.getTime());
  const futureEvents = pendingEvents.filter(e => e.time.getTime() > administeredAt.getTime());

  const pastEvent = pastEvents.length > 0 ? pastEvents[pastEvents.length - 1] : undefined;
  const futureEvent = futureEvents.length > 0 ? futureEvents[0] : undefined;

  if (pastEvent && futureEvent) {
     const midpointTime = pastEvent.time.getTime() + (futureEvent.time.getTime() - pastEvent.time.getTime()) / 2;
     
     if (administeredAt.getTime() <= midpointTime) {
       // it's strictly before or at midpoint, auto-link to past
       return { isAmbiguous: false, selectedEventId: pastEvent.id };
     } else {
       // it's past the midpoint, so it's ambiguous
       return { isAmbiguous: true, pastEvent, futureEvent };
     }
  } else if (pastEvent) {
     // no future event pending, so it's definitely the past one
     return { isAmbiguous: false, selectedEventId: pastEvent.id };
  } else if (futureEvent) {
     // early for the first pending event, auto link to it
     return { isAmbiguous: false, selectedEventId: futureEvent.id }
  }

  return { isAmbiguous: false }
}

export async function resolveAndAutoSkip(
  medicationId: string,
  eventId: string,
  scheduleId: string | null
) {
  if (!scheduleId) return;

  const targetEvent = await prisma.medicationEvent.findUnique({
    where: { id: eventId },
    select: { originalTime: true, time: true }
  })

  if (!targetEvent) return;

  // Find all PENDING events for this schedule that have originalTime older than the administered one
  const referenceTime = targetEvent.originalTime || targetEvent.time;
  
  await prisma.medicationEvent.updateMany({
    where: {
      scheduleId,
      status: 'PENDING',
      originalTime: {
        lt: referenceTime
      }
    },
    data: {
      status: 'SKIPPED'
    }
  })
}
