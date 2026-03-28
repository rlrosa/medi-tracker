import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { checkViolations } from '@/lib/warning-engine'
import { evaluateAmbiguity, resolveAndAutoSkip } from '@/lib/ambiguity-detector'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const medName = url.searchParams.get('name')
  const dateStr = url.searchParams.get('date')
  const startDateStr = url.searchParams.get('startDate')
  const endDateStr = url.searchParams.get('endDate')
  const userId = url.searchParams.get('user')

  const whereClause: any = {
    medication: {
      patient: {
        accountId: session.accountId as string
      }
    }
  }

  if (medName) {
    whereClause.medication.name = { contains: medName, mode: 'insensitive' }
  }
  
  if (userId) {
    whereClause.administeredByUserId = userId
  }

  if (startDateStr || endDateStr) {
    whereClause.administeredAt = {}
    if (startDateStr) whereClause.administeredAt.gte = new Date(startDateStr)
    if (endDateStr) whereClause.administeredAt.lte = new Date(endDateStr)
  } else if (dateStr) {
    const start = new Date(dateStr)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateStr)
    end.setHours(23, 59, 59, 999)
    whereClause.administeredAt = { gte: start, lte: end }
  }

  try {
    const logs = await prisma.administrationLog.findMany({
      where: whereClause,
      orderBy: { administeredAt: 'desc' },
      include: {
        medication: {
          include: {
            schedules: {
              take: 1,
              select: { icon: true, color: true }
            }
          }
        },
        schedule: {
          select: { icon: true, color: true }
        },
        administeredByUser: { select: { id: true, name: true, email: true, username: true } }
      }
    })
    return NextResponse.json({ logs })
  } catch (err) {
    console.error('Error fetching logs', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await request.json()
    const { medicationId, administeredAt, notes, administeredByUserId, scheduledAt, scheduleId, status, eventId, isOverride } = data
    
    // Verify medication belongs to the account
    const medication = await prisma.medication.findFirst({
      where: {
        id: String(medicationId),
        patient: {
          accountId: session.accountId as string
        }
      }
    })

    if (!medication) {
      return NextResponse.json({ error: 'Invalid Medication ID' }, { status: 400 })
    }

    let finalUserId: string = String(session.userId)
    if (session.role === 'ADMIN' && typeof administeredByUserId === 'string' && administeredByUserId) {
      finalUserId = administeredByUserId
    }

    let finalEventId = eventId || null;

    if (!finalEventId && status !== 'SKIPPED') {
      const ambiguityRes = await evaluateAmbiguity(String(medicationId), new Date(String(administeredAt)), scheduleId ? String(scheduleId) : null);
      if (ambiguityRes.isAmbiguous) {
        return NextResponse.json({
          error: 'AMBIGUOUS_EVENT',
          pastEvent: ambiguityRes.pastEvent,
          futureEvent: ambiguityRes.futureEvent
        }, { status: 409 });
      }
      if (ambiguityRes.selectedEventId) {
        finalEventId = ambiguityRes.selectedEventId;
      }
    }

    // 3. WARNING CHECK
    let warningType = null
    let warningMessage = null
    if (status !== 'SKIPPED') {
      const targetTime = new Date(String(administeredAt))
      const violations = await checkViolations(
        medication.patientId as string,
        { medicationId: String(medicationId), time: targetTime, id: finalEventId }
      )

      if (violations.length > 0) {
        if (!isOverride) {
          return NextResponse.json({ 
            error: 'CONFLICT', 
            message: 'Medication window violation detected',
            violations 
          }, { status: 409 })
        }
        warningType = violations[0].type
        warningMessage = violations[0].message
      }
    }

    const log = await prisma.administrationLog.create({
      data: {
        medicationId: String(medicationId),
        scheduleId: scheduleId ? String(scheduleId) : null,
        status: status === 'SKIPPED' ? 'SKIPPED' : 'ADMINISTERED',
        administeredAt: new Date(String(administeredAt)),
        scheduledAt: scheduledAt ? new Date(String(scheduledAt)) : null,
        administeredByUserId: finalUserId,
        notes: typeof notes === 'string' && notes ? notes : null,
        eventId: finalEventId || null,
        warningType: warningType,
        warningMessage: warningMessage,
        isOverride: isOverride || false
      }
    })

    if (finalEventId) {
      await prisma.medicationEvent.update({
        where: { id: finalEventId },
        data: {
          status: status === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED'
        }
      })
      if (status !== 'SKIPPED') {
         await resolveAndAutoSkip(String(medicationId), finalEventId, scheduleId ? String(scheduleId) : null);
      }
    }

    return NextResponse.json({ log })
  } catch (error) {
    console.error('Error creating log', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
