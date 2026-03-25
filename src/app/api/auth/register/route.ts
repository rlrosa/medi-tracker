import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const { username, password, name } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // Default first user to ADMIN
    const userCount = await prisma.user.count()
    const role = userCount === 0 ? 'ADMIN' : 'USER'

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name: name || '',
        role,
      },
    })

    await createSession(user.id, user.role)

    return NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Registration error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
