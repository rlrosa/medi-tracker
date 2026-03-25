import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    await createSession(user.id, user.role)

    return NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Login error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
