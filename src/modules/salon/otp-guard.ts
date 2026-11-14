import Redis from 'ioredis'
import { rateLimit } from './otp-policy'
import { isProductionRuntime } from '@/lib/env/production'

let redis: Redis | null = null

function client() {
  if (!process.env.REDIS_URL) return null
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      enableOfflineQueue: false,
    })
  }
  return redis
}

async function hit(key: string, limit: number, ttlSeconds: number) {
  const store = client()
  if (!store) throw new Error('NO_REDIS')
  if (store.status === 'wait') await store.connect()
  const count = await store.incr(key)
  if (count === 1) await store.expire(key, ttlSeconds)
  if (count > limit) throw new Error('OTP_RATE_LIMIT')
}

export async function guardOtpSend(input: { phone: string; ip: string; purpose: string }) {
  const memory = () => {
    if (!rateLimit(`otp-phone:${input.phone}`, 5, 10 * 60 * 1000)) throw new Error('OTP_RATE_LIMIT')
    if (!rateLimit(`otp-ip:${input.ip}`, 30, 10 * 60 * 1000)) throw new Error('OTP_RATE_LIMIT')
    if (!rateLimit(`otp-cool:${input.purpose}:${input.phone}`, 1, 60 * 1000)) throw new Error('OTP_COOLDOWN')
  }
  try {
    const store = client()
    if (!store) {
      if (isProductionRuntime()) throw new Error('OTP_LIMIT_UNAVAILABLE')
      memory()
      return
    }
    if (store.status === 'wait') await store.connect()
    const cooldown = await store.set(`otp:cool:${input.purpose}:${input.phone}`, '1', 'EX', 60, 'NX')
    if (cooldown !== 'OK') throw new Error('OTP_COOLDOWN')
    await hit(`otp:phone:${input.phone}`, 5, 600)
    await hit(`otp:ip:${input.ip}`, 30, 600)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('OTP_')) throw error
    if (isProductionRuntime()) throw new Error('OTP_LIMIT_UNAVAILABLE')
    memory()
  }
}

export async function guardOtpVerify(input: { phone: string; ip: string }) {
  try {
    const store = client()
    if (!store) {
      if (isProductionRuntime()) throw new Error('OTP_LIMIT_UNAVAILABLE')
      if (!rateLimit(`otp-verify:${input.phone}:${input.ip}`, 8, 10 * 60 * 1000)) {
        throw new Error('OTP_RATE_LIMIT')
      }
      return
    }
    await hit(`otp:verify:${input.ip}:${input.phone}`, 8, 600)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('OTP_')) throw error
    if (isProductionRuntime()) throw new Error('OTP_LIMIT_UNAVAILABLE')
    if (!rateLimit(`otp-verify:${input.phone}:${input.ip}`, 8, 10 * 60 * 1000)) {
      throw new Error('OTP_RATE_LIMIT')
    }
  }
}
