import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

// List invitations for the account
export async function GET() {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [invitations, users] = await Promise.all([
      prisma.invitation.findMany({
        where: { accountId: session.accountId as string },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: { accountId: session.accountId as string },
        select: { id: true, email: true, role: true, name: true, createdAt: true }
      })
    ])

    // Format users to match invitation-like structure for the UI
    const activeCaregivers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      name: u.name,
      acceptedAt: u.createdAt, // Use creation date as acceptance date
      isUser: true
    }))

    return NextResponse.json({ invitations: [...activeCaregivers, ...invitations] })
  } catch (error) {
    console.error('Error fetching invitations', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new invitation
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.accountId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { email, role } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: role || 'CAREGIVER',
        token,
        accountId: session.accountId as string,
        expiresAt
      }
    })

    // In a real app, we would send an email here.
    // For this demo, we'll return the invitation with the token.
    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Error creating invitation', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
