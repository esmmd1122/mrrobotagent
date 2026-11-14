import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { LoginForm } from '../LoginForm'

export default async function AccountLoginPage() {
  const session = await getCustomerSession()
  if (session) redirect('/account')

  return (
    <div className="section-glow pt-24 pb-16">
      <div className="mx-auto max-w-md px-4">
        <h1 className="text-xl font-bold">ورود به حساب کاربری</h1>
        <LoginForm />
        <p className="mt-4 text-sm text-mr-muted">
          حساب ندارید؟{' '}
          <Link href="/account/register" className="text-mr-red">
            ثبت‌نام
          </Link>
        </p>
        <p className="mt-2 text-xs text-mr-muted">
          پیگیری بدون حساب: از لینک ایمیل یا{' '}
          <Link href="/orders/track" className="underline">
            صفحه پیگیری
          </Link>{' '}
          با شماره سفارش و توکن استفاده کنید.
        </p>
      </div>
    </div>
  )
}