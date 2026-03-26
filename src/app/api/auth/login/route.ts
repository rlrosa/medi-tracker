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
      include: { account: true }
    })

    if (!user || !user.account) {
      return NextResponse.json({ error: 'Invalid credentials or account missing' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Ensure accountId is present before creating session
    if (!user.accountId) {
      throw new Error('User created without an account link')
    }

    // Log them in immediately
    await createSession(user.id, user.accountId, user.role)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      account: { id: user.account.id, name: user.account.name, type: user.account.type }
    })
  } catch (error: any) {
    console.error('Login error for identifier:', identifier)
    console.error('Error stack:', error?.stack || error)
    return NextResponse.json({ error: 'Internal server error: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
