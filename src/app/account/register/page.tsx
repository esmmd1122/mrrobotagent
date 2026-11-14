import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { RegisterForm } from '../RegisterForm'

export default async function AccountRegisterPage() {
  const session = await getCustomerSession()
  if (session) redirect('/account')

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-md px-4">
        <h1 className="text-xl font-bold">ثبت‌نام</h1>
        <RegisterForm />
        <p className="mt-4 text-sm text-mr-muted">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link href="/account/login" className="text-mr-red">
            ورود
          </Link>
        </p>
      </div>
    </div>
  )
}