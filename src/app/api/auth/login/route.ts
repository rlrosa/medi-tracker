import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

export async function POST(request: Request) {
  let identifier = 'unknown'
  try {
    const body = await request.json()
    identifier = body.email || 'none'
    const password = body.password

    if (!identifier || identifier === 'none' || !password) {
      return NextResponse.json({ error: 'Email/Username and password are required' }, { status: 400 })
    }

    console.log('Attempting login for:', identifier)

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      },
      include: {
        account: true,
        accountAccesses: {
          include: { account: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check approval and email verification
    if (!user.isApproved && !user.emailVerified) {
      return NextResponse.json({ error: 'Account pending. Please verify your email or wait for superadmin approval.' }, { status: 403 })
    }

    // Determine primary account (default to their legacy accountId or the first one they have access to)
    let primaryAccountId = user.accountId
    let primaryAccount = user.account
    let roleInAccount = 'USER'

    if (user.accountAccesses.length > 0) {
      // If the user's legacy account is in their accesses, use that, else use the first one
      const access = user.accountAccesses.find(a => a.accountId === user.accountId) || user.accountAccesses[0]
      primaryAccountId = access.accountId
      primaryAccount = access.account
      roleInAccount = access.role
    }

    if (!primaryAccountId || !primaryAccount) {
      return NextResponse.json({ error: 'No account access found for user' }, { status: 401 })
    }

    // Use global role if SUPERADMIN, else use their role in the active account
    const sessionRole = user.role === 'SUPERADMIN' ? 'SUPERADMIN' : roleInAccount

    // Log them in immediately
    await createSession(user.id, primaryAccountId, sessionRole)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: sessionRole, roleInAccount },
      account: { id: primaryAccount.id, name: primaryAccount.name, type: primaryAccount.type }
    })
  } catch (error: any) {
    console.error('Login error for identifier:', identifier)
    console.error('Error stack:', error?.stack || error)
    return NextResponse.json({ error: 'Internal server error: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
