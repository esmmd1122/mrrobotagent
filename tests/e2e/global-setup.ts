import { request } from '@playwright/test'

export default async function globalSetup() {
  const api = await request.newContext({ baseURL: 'http://localhost:3111' })
  const gets = [
    '/studio/register',
    '/studio/login',
    '/api/health',
    '/api/salon/warmup/slots?offeringId=x&date=2026-11-15',
  ]
  for (const path of gets) {
    await api.get(path, { timeout: 120000 })
  }
  await api.post('/api/salon/warmup/otp', {
    data: { phone: '09120000000', purpose: 'BOOK' },
    timeout: 120000,
  })
  await api.post('/api/salon/warmup/verify', {
    data: { phone: '09120000000', code: '000000', purpose: 'BOOK' },
    timeout: 120000,
  })
  await api.post('/api/salon/warmup/book', {
    data: {},
    timeout: 120000,
  })
  await api.dispose()
}
