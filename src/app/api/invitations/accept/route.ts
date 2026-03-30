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
      // If user exists, they must authenticate with their proper password
      const isMatch = await bcrypt.compare(password, existingUser.passwordHash)
      if (!isMatch) {
        return NextResponse.json({ error: 'User already exists. Incorrect password to link account.' }, { status: 401 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    let user = existingUser
    let roleInAccount = invitation.role

    await prisma.$transaction(async (tx) => {
      if (!user) {
        // Create user if they don't exist
        user = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash: hashedPassword,
            name,
            role: 'USER', // Global role
            accountId: invitation.accountId, // legacy
            isApproved: true, // Caregivers are implicitly approved by the admin inviting them
            emailVerified: new Date(), // Implicitly verified since they received the email
          }
        })
      }

      // Add access to the account
      if (invitation.accountId) {
        const access = await tx.accountAccess.upsert({
          where: {
            userId_accountId: {
              userId: user.id,
              accountId: invitation.accountId
            }
          },
          create: {
            userId: user.id,
            accountId: invitation.accountId,
            role: invitation.role
          },
          update: {
            role: invitation.role
          }
        })
        roleInAccount = access.role
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })
    })

    if (!user || !invitation.accountId) {
      throw new Error('User creation failed or missing account link')
    }

    // Use global role if SUPERADMIN, else use the role within the account they are switching to
    const sessionRole = user.role === 'SUPERADMIN' ? 'SUPERADMIN' : roleInAccount

    // Log them in immediately to the workspace they were invited to
    await createSession(user.id, invitation.accountId, sessionRole)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting invitation', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
