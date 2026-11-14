import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { BookingDesk } from '@/components/salon/BookingDesk'
import { toman } from '@/modules/salon/format'
import '@/styles/salon-booking.css'

const categoryLabel: Record<string, string> = {
  BARBER: 'آرایشگاه مردانه',
  HAIR_SALON: 'سالن مو',
  BEAUTY_SALON: 'سالن زیبایی',
  NAIL: 'ناخن',
  SPA: 'اسپا',
  CLINIC: 'کلینیک زیبایی',
}

export default async function PublicSalonPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const business = await prisma.salonBusiness.findUnique({
    where: { slug },
    include: {
      offerings: { where: { isActive: true }, orderBy: { name: 'asc' } },
      employees: { where: { isActive: true }, orderBy: { name: 'asc' } },
      hours: { orderBy: { dayOfWeek: 'asc' } },
    },
  })
  if (!business || !business.published || business.status !== 'ACTIVE') notFound()
  const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
  const isBarber = business.category === 'BARBER'
  const accent = isBarber ? '#C9A227' : business.accentColor || '#C9A227'
  const tag = categoryLabel[business.category] || 'رزرو آنلاین'

  return (
    <div className="mr-public-booking" dir="rtl">
      <div className="sb-hero">
        {business.coverUrl && (
          <div className="sb-hero-cover" style={{ backgroundImage: `url(${business.coverUrl})` }} />
        )}
        <div className="sb-orb" style={{ top: '20%', left: '10%' }} aria-hidden />
        <div className="sb-hero-glow" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 pb-20 pt-0 sm:max-w-xl">
        <header className="sb-card -mt-20 p-6">
          <div className="flex items-start gap-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt=""
                className="h-20 w-20 shrink-0 border border-[rgba(212,175,55,0.35)] object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-[rgba(212,175,55,0.35)] bg-[#0f0d0b] text-3xl" aria-hidden>
                ✂
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="sb-kicker">ONLINE BOOKING</p>
              <h1 className="sb-title mt-1">{business.name}</h1>
              <span className="sb-badge-barber">{tag}</span>
            </div>
          </div>
          {business.description ? (
            <p className="mt-4 text-sm leading-relaxed text-[var(--sb-muted)]">{business.description}</p>
          ) : null}
          {business.address ? <p className="mt-2 text-sm text-[var(--sb-cream)]">{business.address}</p> : null}
          {business.phone ? (
            <p className="mt-1 text-sm" dir="ltr">
              <span className="text-[var(--sb-muted)]">تلفن: </span>
              {business.phone}
            </p>
          ) : null}
          <details className="mt-4 text-xs text-[var(--sb-muted)]">
            <summary className="cursor-pointer text-[var(--sb-gold)]">ساعت کاری</summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {business.hours.map((h) => (
                <li key={h.id}>
                  {days[h.dayOfWeek]}: {h.closed ? 'تعطیل' : `${h.startTime}–${h.endTime}`}
                </li>
              ))}
            </ul>
          </details>
        </header>

        {business.offerings.length > 0 && (
          <section className="sb-card mt-4 overflow-hidden">
            <p className="border-b border-[rgba(212,175,55,0.15)] px-4 py-3 text-xs tracking-widest text-[var(--sb-gold)]">
              خدمات
            </p>
            {business.offerings.map((s) => (
              <div key={s.id} className="sb-service-row">
                <div>
                  <p className="font-medium text-[var(--sb-cream)]">{s.name}</p>
                  {s.description ? (
                    <p className="mt-0.5 text-xs text-[var(--sb-muted)]">{s.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--sb-muted)]">{s.durationMinutes} دقیقه</p>
                </div>
                <span className="sb-price">{toman(s.priceToman)}</span>
              </div>
            ))}
          </section>
        )}

        {business.employees.length > 0 && (
          <section className="sb-card mt-4 p-4">
            <p className="text-xs tracking-widest text-[var(--sb-gold)]">آرایشگر / پرسنل</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {business.employees.map((e) => (
                <span
                  key={e.id}
                  className="border border-[rgba(212,175,55,0.2)] bg-[#0f0d0b] px-3 py-1.5 text-sm"
                >
                  {e.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <BookingDesk
            slug={business.slug}
            accent={accent}
            theme={isBarber ? 'barber' : 'gold'}
            cancellationHours={business.cancellationHours}
            offerings={business.offerings.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              priceToman: s.priceToman,
              durationMinutes: s.durationMinutes,
            }))}
            employees={business.employees.map((e) => ({ id: e.id, name: e.name }))}
          />
        </section>

        <p className="sb-footer-brand mt-10 text-center">
          Powered by <strong>MR.ROBOT AI</strong>
        </p>
      </div>
    </div>
  )
}