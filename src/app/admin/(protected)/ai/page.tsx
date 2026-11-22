import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PERMISSIONS } from '@/lib/auth/constants'
import { parseAIProjectRecord } from '@/lib/ai-projects'
import { getPublishedWebsiteConfig } from '@/lib/site-config/service'
import { getSectionConfig } from '@/lib/site-config/cms-helpers'
import { AdminAIRequestsClient } from '@/components/admin/AdminAIRequestsClient'
import { AdminAISectionImageCard } from '@/components/admin/AdminAISectionImageCard'

export default async function AdminAIPage() {
  await requireAdmin(PERMISSIONS.AI_MANAGE)
  const [offerings, requests, siteConfig, mediaAssets] = await Promise.all([
    prisma.aIServiceOffering.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.aIServiceRequest.findMany({
      include: { customer: true, offering: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    getPublishedWebsiteConfig(),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
  ])

  const parsedRequests = requests.map((r) => parseAIProjectRecord(r))
  const aiBuilderSection = getSectionConfig(siteConfig, 'services')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">MR.ROBOT AI — مدیریت پروژه‌های اختصاصی</h1>
          <p className="mt-1 text-xs text-white/55">
            مشاهده درخواست‌های ساخت پروژه هوش مصنوعی، ثبت پیش‌فاکتور، زمان تحویل و مدیریت تصویر بخش
            MR.ROBOT AI صفحه اصلی
          </p>
        </div>
      </div>

      <AdminAISectionImageCard
        initialImageUrl={aiBuilderSection.imageUrl || ''}
        initialImageAlt={aiBuilderSection.imageAlt || ''}
        initialMedia={mediaAssets.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          sizeBytes: m.sizeBytes,
          altText: m.altText,
        }))}
      />

      <AdminAIRequestsClient initialRequests={parsedRequests} />

      <section className="admin-card p-4">
        <h2 className="font-semibold text-white">سرویس‌های پایه ثبت‌شده در کاتالوگ AI</h2>
        <ul className="mt-2 space-y-1 text-sm text-white/80">
          {offerings.map((o) => (
            <li key={o.id}>
              {o.titleFa} — {o.isAvailable ? 'فعال' : 'غیرفعال'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
