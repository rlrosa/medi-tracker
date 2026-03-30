import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    if (user.emailVerified) {
      return NextResponse.redirect(new URL('/login?verified=already', request.url))
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        // Keep the token for reference or null it out if you prefer, we'll keep it for now.
      }
    })

    return NextResponse.redirect(new URL('/login?verified=true', request.url))
  } catch (error) {
    console.error('Email verification error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
