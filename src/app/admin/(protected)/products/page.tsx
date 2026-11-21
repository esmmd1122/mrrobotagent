import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Star,
} from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { effectiveUnitPrice, formatStoreMoney } from '@/modules/commerce/pricing'
import { ProductDeleteButton } from '@/components/admin/ProductDeleteButton'

const PAGE_SIZE = 12

type SearchParams = {
  q?: string
  category?: string
  status?: string
  sort?: string
  page?: string
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdmin(PERMISSIONS.PRODUCTS_MANAGE)
  const sp = await searchParams

  const q = sp.q?.trim() || ''
  const categoryId = sp.category?.trim() || ''
  const status = sp.status?.trim() || ''
  const sort = sp.sort?.trim() || 'order'
  const requestedPage = Math.max(1, Number.parseInt(sp.page || '1', 10) || 1)

  const where: Prisma.ProductWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(status === 'active' ? { isVisible: true } : {}),
    ...(status === 'inactive' ? { isVisible: false } : {}),
    ...(status === 'available' ? { isAvailable: true } : {}),
    ...(status === 'unavailable' ? { isAvailable: false } : {}),
    ...(status === 'featured' ? { isFeatured: true } : {}),
    ...(q
      ? {
          OR: [
            { nameFa: { contains: q } },
            { nameEn: { contains: q } },
            { slug: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === 'newest'
      ? [{ createdAt: 'desc' }]
      : sort === 'price_asc'
        ? [{ price: 'asc' }, { sortOrder: 'asc' }]
        : sort === 'price_desc'
          ? [{ price: 'desc' }, { sortOrder: 'asc' }]
          : sort === 'name'
            ? [{ nameFa: 'asc' }]
            : [{ sortOrder: 'asc' }, { createdAt: 'desc' }]

  const [totalCount, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      plans: { where: { isActive: true }, select: { id: true, price: true, promoPrice: true } },
    },
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  function buildPageHref(nextPage: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (categoryId) params.set('category', categoryId)
    if (status) params.set('status', status)
    if (sort && sort !== 'order') params.set('sort', sort)
    if (nextPage > 1) params.set('page', String(nextPage))
    const qs = params.toString()
    return qs ? `/admin/products?${qs}` : '/admin/products'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">مدیریت محصولات</h1>
          <p className="mt-1 text-xs text-[#9297A3]">
            مجموع نتایج: {totalCount.toLocaleString('fa-IR')} محصول در {categories.length.toLocaleString('fa-IR')} دسته‌بندی
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/categories"
            className="inline-flex min-h-[40px] items-center rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-white/10"
          >
            مدیریت دسته‌ها
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#e10600] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(225,6,0,0.28)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            <span>محصول جدید</span>
          </Link>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <form className="admin-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            name="q"
            defaultValue={q}
            placeholder="جستجوی نام، اسلاگ یا توضیح..."
            className="admin-input pr-9"
          />
        </div>

        <select name="category" defaultValue={categoryId} className="admin-input lg:col-span-3">
          <option value="">همه دسته‌بندی‌ها</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameFa}
            </option>
          ))}
        </select>

        <select name="status" defaultValue={status} className="admin-input lg:col-span-2">
          <option value="">همه وضعیت‌ها</option>
          <option value="active">فعال (قابل مشاهده)</option>
          <option value="inactive">مخفی (غیرفعال)</option>
          <option value="available">موجود</option>
          <option value="unavailable">ناموجود</option>
          <option value="featured">محصولات ویژه</option>
        </select>

        <select name="sort" defaultValue={sort} className="admin-input lg:col-span-2">
          <option value="order">مرتب‌سازی: پیش‌فرض</option>
          <option value="newest">جدیدترین</option>
          <option value="price_asc">ارزان‌ترین</option>
          <option value="price_desc">گران‌ترین</option>
          <option value="name">الفبایی</option>
        </select>

        <div className="flex gap-2 lg:col-span-1">
          <button
            type="submit"
            className="w-full rounded-lg bg-[#e10600] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            اعمال
          </button>
        </div>
      </form>

      {q || categoryId || status || sort !== 'order' ? (
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>فیلترها فعال هستند.</span>
          <Link href="/admin/products" className="text-[#e10600] hover:underline">
            پاک کردن فیلترها
          </Link>
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm text-white/70">محصولی مطابق جستجو یا فیلتر انتخابی یافت نشد.</p>
          <Link
            href="/admin/products/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#e10600] px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>ایجاد اولین محصول</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="admin-card hidden overflow-x-auto lg:block">
            <table className="admin-table w-full min-w-[920px]">
              <thead>
                <tr>
                  <th>تصویر</th>
                  <th>نام محصول</th>
                  <th>دسته‌بندی</th>
                  <th>قیمت / تخفیف</th>
                  <th>موجودی</th>
                  <th>وضعیت نمایش</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const unit = effectiveUnitPrice(p.price, p.promoPrice)
                  const hasDiscount =
                    p.promoPrice != null && p.price != null && p.promoPrice < p.price
                  const minPlanPrice =
                    p.plansEnabled && p.plans.length > 0
                      ? Math.min(
                          ...p.plans.map(
                            (pl) => effectiveUnitPrice(pl.price, pl.promoPrice) ?? pl.price,
                          ),
                        )
                      : null

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="h-12 w-16 overflow-hidden rounded border border-white/10 bg-[#0b0d13]">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.nameFa}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white/25">
                              <ImageOff className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">{p.nameFa}</span>
                          {p.isFeatured ? (
                            <span
                              title="محصول ویژه"
                              className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                            >
                              <Star className="h-3 w-3 fill-amber-300" />
                              ویژه
                            </span>
                          ) : null}
                        </div>
                        {p.nameEn ? (
                          <p className="mt-0.5 text-xs text-white/45" dir="ltr">
                            {p.nameEn}
                          </p>
                        ) : null}
                      </td>
                      <td>
                        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80">
                          {p.category.nameFa}
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {p.plansEnabled && minPlanPrice != null ? (
                          <div>
                            <span className="font-semibold text-white">
                              از {formatStoreMoney(minPlanPrice, p.currency)}
                            </span>
                            <p className="text-[11px] text-sky-300">
                              {p.plans.length.toLocaleString('fa-IR')} طرح فعال
                            </p>
                          </div>
                        ) : unit != null ? (
                          <div>
                            <span className="font-semibold text-white">
                              {formatStoreMoney(unit, p.currency)}
                            </span>
                            {hasDiscount && p.price != null ? (
                              <span className="mr-2 text-xs text-white/45 line-through">
                                {formatStoreMoney(p.price, p.currency)}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-white/50">تماس بگیرید</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            p.isAvailable
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-zinc-500/20 text-zinc-300'
                          }`}
                        >
                          {p.isAvailable ? 'موجود' : 'ناموجود'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            p.isVisible
                              ? 'bg-sky-500/15 text-sky-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {p.isVisible ? 'فعال' : 'مخفی'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white transition hover:border-[#e10600]/60 hover:text-[#ff4d6d]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>ویرایش</span>
                          </Link>
                          <ProductDeleteButton productId={p.id} productName={p.nameFa} compact />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Card View (zero horizontal overflow) */}
          <div className="grid gap-3 lg:hidden">
            {products.map((p) => {
              const unit = effectiveUnitPrice(p.price, p.promoPrice)
              const hasDiscount =
                p.promoPrice != null && p.price != null && p.promoPrice < p.price
              return (
                <article key={p.id} className="admin-card space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded border border-white/10 bg-[#0b0d13]">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.nameFa}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/25">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate font-semibold text-white">{p.nameFa}</h3>
                        {p.isFeatured ? (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
                            ویژه
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[#9297A3]">{p.category.nameFa}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={
                            p.isAvailable ? 'text-emerald-300' : 'text-zinc-400'
                          }
                        >
                          {p.isAvailable ? '● موجود' : '● ناموجود'}
                        </span>
                        <span className={p.isVisible ? 'text-sky-300' : 'text-amber-300'}>
                          {p.isVisible ? 'فعال در سایت' : 'مخفی'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <div className="text-sm font-bold tabular-nums">
                      {unit != null ? (
                        <>
                          <span>{formatStoreMoney(unit, p.currency)}</span>
                          {hasDiscount && p.price != null ? (
                            <span className="mr-2 text-xs font-normal text-white/45 line-through">
                              {formatStoreMoney(p.price, p.currency)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs font-normal text-white/50">تماس بگیرید</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>ویرایش</span>
                      </Link>
                      <ProductDeleteButton productId={p.id} productName={p.nameFa} compact />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <nav
              aria-label="صفحه‌بندی محصولات"
              className="flex items-center justify-between gap-3 pt-2 text-xs"
            >
              <span className="text-white/55">
                صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
              </span>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={buildPageHref(page - 1)}
                    className="inline-flex items-center gap-1 rounded border border-white/15 px-3 py-1.5 text-white hover:bg-white/5"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>قبلی</span>
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link
                    href={buildPageHref(page + 1)}
                    className="inline-flex items-center gap-1 rounded border border-white/15 px-3 py-1.5 text-white hover:bg-white/5"
                  >
                    <span>بعدی</span>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
