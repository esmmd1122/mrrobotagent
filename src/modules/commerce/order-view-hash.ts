import { createHmac } from 'crypto'

function viewTokenSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET is required for order access tokens')
  }
  return secret
}

export function hashOrderViewToken(token: string): string {
  return createHmac('sha256', viewTokenSecret()).update(token).digest('base64url')
}