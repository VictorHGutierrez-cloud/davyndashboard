import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-dev-secret')
const COOKIE = 'davyn_session'

export async function signToken(email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { email: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function cookieName() { return COOKIE }
