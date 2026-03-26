import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const { email, password, name, accountName, accountType } = await request.json()

    if (!email || !password || !accountName) {
      return NextResponse.json({ error: 'Email, password, and account name are required' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Create Account and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: accountName,
          type: accountType || 'SOLO',
        },
      })

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: name || '',
          role: 'ADMIN',
          accountId: account.id,
        },
      })

      // If Solo mode, create a "Self" patient
      if (account.type === 'SOLO') {
        await tx.patient.create({
          data: {
            name: name || 'Self',
            selfMedication: true,
            accountId: account.id,
            userId: user.id
          },
        })
      }

      return { user, account }
    })

    await createSession(result.user.id, result.account.id, result.user.role)

    return NextResponse.json({
      user: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role },
      account: { id: result.account.id, name: result.account.name, type: result.account.type }
    })
  } catch (error) {
    console.error('Registration error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
