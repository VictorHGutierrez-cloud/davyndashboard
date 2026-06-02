import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, cookieName } from '@/lib/auth'

export const config = { matcher: ['/dashboard/:path*', '/api/deals/:path*'] }

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(cookieName())?.value
  if (!token || !(await verifyToken(token))) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}
