import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, createSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { token, password, name } = await request.json()
    if (!token || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token }
    })

    if (!invitation || invitation.acceptedAt || (invitation.expiresAt < new Date())) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and mark invitation as accepted in a transaction
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash: hashedPassword,
          name,
          role: invitation.role,
          accountId: invitation.accountId
        }
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })
    ])

    // Log them in immediately
    await createSession(user.id, user.accountId, user.role)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting invitation', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
