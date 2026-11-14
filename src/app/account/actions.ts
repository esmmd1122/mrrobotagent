'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { updateCustomerProfile, logoutCustomer } from '@/modules/customer-auth/service'
import { markAllNotificationsRead } from '@/modules/notifications/service'

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
})

export async function saveProfile(formData: FormData) {
  const session = await getCustomerSession()
  if (!session) redirect('/account/login')

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') || '',
  })
  if (!parsed.success) throw new Error('ورودی نامعتبر')

  const result = await updateCustomerProfile(session.sub, {
    name: parsed.data.name,
    phone: parsed.data.phone?.trim() || null,
  })
  if (!result.ok) throw new Error(result.error || 'ذخیره ناموفق')

  revalidatePath('/account')
  revalidatePath('/account/profile')
}

export async function logoutAction() {
  await logoutCustomer()
  redirect('/account/login')
}

export async function markAllNotificationsReadAction() {
  const session = await getCustomerSession()
  if (!session) redirect('/account/login')
  await markAllNotificationsRead(session.sub)
  revalidatePath('/account/notifications')
  revalidatePath('/account')
}