import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { createSession } from '@/lib/session'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { sendVerificationEmail } from '@/lib/email'

// Basic rate limiting map (IP -> timestamp array)
const rateLimitMap = new Map<string, number[]>()

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()

    // Clean up old entries
    const userTimestamps = rateLimitMap.get(ip) || []
    const recentTimestamps = userTimestamps.filter(t => now - t < 60000) // 1 minute window

    if (recentTimestamps.length >= 5) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 })
    }

    recentTimestamps.push(now)
    rateLimitMap.set(ip, recentTimestamps)

    const { email, password, name, accountName, accountType, turnstileToken } = await request.json()

    if (!email || !password || !accountName) {
      return NextResponse.json({ error: 'Email, password, and account name are required' }, { status: 400 })
    }

    if (!turnstileToken) {
      return NextResponse.json({ error: 'Captcha validation required' }, { status: 400 })
    }

    const isValidToken = await verifyTurnstileToken(turnstileToken)
    if (!isValidToken) {
      return NextResponse.json({ error: 'Invalid captcha token' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const verificationToken = uuidv4()

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
          verificationToken,
          isApproved: false,
        },
      })

      // Link User to Account in multi-tenant setup
      await tx.accountAccess.create({
        data: {
          userId: user.id,
          accountId: account.id,
          role: 'ADMIN',
        }
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

    await sendVerificationEmail(email, verificationToken)

    // We no longer log them in immediately, they must verify email or get approved.
    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account or wait for superadmin approval.',
    })
  } catch (error) {
    console.error('Registration error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
