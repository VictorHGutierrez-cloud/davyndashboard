import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, cookieName } from '@/lib/auth'

function loadUsers(): Map<string, string> {
  const users = new Map<string, string>()
  const raw = process.env.DASHBOARD_USERS ?? ''
  raw.split(',').forEach(entry => {
    const [email, hash] = entry.trim().split(':', 2)
    if (email && hash) users.set(email.toLowerCase(), hash)
  })
  return users
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password)
    return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 })

  const users = loadUsers()
  const hash = users.get(email.toLowerCase())
  if (!hash || !(await bcrypt.compare(password, hash)))
    return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })

  const token = await signToken(email)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8h
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(cookieName())
  return res
}
