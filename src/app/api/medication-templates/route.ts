import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

const DEFAULT_TEMPLATES = [
  { id: 't1', name: 'Vitamin D', intervalHours: 24, icon: 'Sun', color: '#f59e0b' },
  { id: 't2', name: 'Iron', intervalHours: 24, icon: 'Activity', color: '#b91c1c' },
  { id: 't3', name: 'Omega 3', intervalHours: 24, icon: 'Droplet', color: '#3b82f6' },
  { id: 't4', name: 'Pain Relief (Ibuprofen/Tylenol)', intervalHours: 6, icon: 'ShieldPulse', color: '#ef4444' },
  { id: 't5', name: 'Antibiotic', intervalHours: 8, icon: 'Capsule', color: '#10b981' },
  { id: 't6', name: 'Blood Pressure', intervalHours: 12, icon: 'Activity', color: '#3b82f6' }
]

export async function GET() {
  const session = await getSession()
  if (!session || !session.accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const dbTemplates = await prisma.medicationTemplate.findMany()
    // Merge or return defaults if empty
    const templates = dbTemplates.length > 0 ? dbTemplates : DEFAULT_TEMPLATES
    return NextResponse.json({ templates })
  } catch (err) {
    console.error('Error fetching templates', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
