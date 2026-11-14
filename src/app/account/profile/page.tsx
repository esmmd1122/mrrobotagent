import { requireCustomer } from '@/lib/customer-auth/require-customer'
import { prisma } from '@/lib/db'
import { AccountNav } from '../AccountNav'
import { saveProfile } from '../actions'
import { countUnreadNotifications } from '@/modules/notifications/service'

export default async function AccountProfilePage() {
  const session = await requireCustomer()
  const [customer, unread] = await Promise.all([
    prisma.customer.findUnique({ where: { id: session.sub } }),
    countUnreadNotifications(session.sub),
  ])
  if (!customer) return null

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-lg space-y-6 px-4">
        <h1 className="text-xl font-bold">پروفایل</h1>
        <AccountNav unread={unread} />
        <form action={saveProfile} className="card-shop space-y-3 p-4">
          <label className="block text-sm">
            نام
            <input
              name="name"
              defaultValue={customer.name}
              required
              className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
            />
          </label>
          <p className="text-sm text-mr-muted">
            ایمیل: <span dir="ltr">{customer.email || '—'}</span> (قابل تغییر از پشتیبانی)
          </p>
          <label className="block text-sm">
            تلفن
            <input
              name="phone"
              defaultValue={customer.phone || ''}
              className="mt-1 w-full rounded-lg border border-mr-border bg-mr-charcoal px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded-lg bg-mr-red px-4 py-2 text-sm font-semibold">
            ذخیره
          </button>
        </form>
      </div>
    </div>
  )
}