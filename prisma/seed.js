/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const ALL_PERMISSIONS = [
  'dashboard:view',
  'products:manage',
  'orders:manage',
  'customers:view',
  'payments:view',
  'ai:manage',
  'support:manage',
  'content:manage',
  'discounts:manage',
  'admins:manage',
  'activity:view',
  'platform:manage',
]

const categories = [
  { slug: 'ai-subscriptions', nameFa: 'اشتراک هوش مصنوعی', nameEn: 'AI Subscriptions', sortOrder: 1 },
  { slug: 'chatgpt-plus', nameFa: 'ChatGPT Plus', nameEn: 'ChatGPT Plus', sortOrder: 2 },
  { slug: 'gemini-pro', nameFa: 'Gemini Pro', nameEn: 'Gemini Pro', sortOrder: 3 },
  { slug: 'grok', nameFa: 'Grok', nameEn: 'Grok', sortOrder: 4 },
  { slug: 'capcut-pro', nameFa: 'CapCut Pro', nameEn: 'CapCut Pro', sortOrder: 5 },
  { slug: 'apple-icloud', nameFa: 'Apple ID و iCloud', nameEn: 'Apple & iCloud', sortOrder: 6 },
  { slug: 'telegram', nameFa: 'خدمات تلگرام', nameEn: 'Telegram Services', sortOrder: 7 },
  { slug: 'other-digital', nameFa: 'سایر خدمات دیجیتال', nameEn: 'Other Digital', sortOrder: 8 },
]

const products = [
  {
    slug: 'chatgpt-plus',
    cat: 'chatgpt-plus',
    nameFa: 'ChatGPT Plus',
    nameEn: 'ChatGPT Plus',
    description:
      'دستیار گفت‌وگوی پیشرفته OpenAI برای نوشتن، تحقیق، کدنویسی و کار خلاقانه حرفه‌ای.',
    details: ['دسترسی به مدل‌های پیشرفته', 'پاسخ‌دهی سریع‌تر در ساعات اوج', 'ابزارهای توسعه‌یافته برای تولید محتوا'],
    features: ['مناسب فریلنسرها', 'پشتیبانی MR.ROBOT در فعال‌سازی'],
    featured: true,
  },
  {
    slug: 'capcut-pro',
    cat: 'capcut-pro',
    nameFa: 'CapCut Pro',
    nameEn: 'CapCut Pro',
    description:
      'ویرایش ویدیو حرفه‌ای با افکت‌ها، قالب‌ها و ابزارهای پیشرفته برای شبکه‌های اجتماعی.',
    details: ['ابزارهای ویرایش پیشرفته', 'قالب‌های آماده و افکت‌های سینمایی', 'خروجی با کیفیت بالا'],
    features: ['مناسب تولیدکنندگان محتوا', 'راهنمای نصب اختصاصی'],
    featured: true,
  },
  {
    slug: 'grok',
    cat: 'grok',
    nameFa: 'Grok',
    nameEn: 'Grok',
    description:
      'دستیار هوش مصنوعی با تمرکز بر پاسخ‌های به‌روز و تحلیل سریع برای تصمیم‌گیری روزانه.',
    details: ['دسترسی به قابلیت‌های پیشرفته', 'مناسب پژوهش و ایده‌پردازی', 'یکپارچه با اکوسیستم xAI'],
    features: ['برای کسب‌وکارهای نوآور', 'مشاوره انتخاب پلن'],
    featured: false,
  },
  {
    slug: 'gemini-pro',
    cat: 'gemini-pro',
    nameFa: 'Gemini Pro',
    nameEn: 'Gemini Pro',
    description:
      'هوش مصنوعی Google برای متن، تحلیل و همکاری تیمی در پروژه‌های دیجیتال.',
    details: ['مدل‌های Pro برای کار حرفه‌ای', 'یکپارچگی با ابزارهای Google', 'تحلیل چندرسانه‌ای'],
    features: ['تیم‌های مارکتینگ', 'پشتیبانی فعال‌سازی'],
    featured: true,
  },
]

const aiOfferings = [
  {
    slug: 'personal-assistant',
    titleFa: 'دستیار هوش مصنوعی شخصی',
    description: 'مدیریت برنامه روزانه، یادآوری‌ها و پاسخ‌های هوشمند.',
    useCase: 'یادآوری جلسات و خلاصه‌سازی پیام‌ها',
  },
  {
    slug: 'business-assistant',
    titleFa: 'دستیار اختصاصی کسب‌وکار',
    description: 'پشتیبانی داخلی، فروش و آموزش تیم با دانش برند.',
    useCase: 'پاسخ به سوالات پرتکرار مشتریان',
  },
]

const siteDefaults = [
  {
    key: 'hero.slogan',
    section: 'hero',
    value: { text: 'با مستر ربات فکرتو نذار' },
  },
  {
    key: 'hero.subtitle',
    section: 'hero',
    value: { text: 'دنیای دیجیتال، یک قدم جلوتر' },
  },
  {
    key: 'contact.telegram',
    section: 'contact',
    value: { url: '' },
  },
  {
    key: 'footer.tagline',
    section: 'footer',
    value: {
      text: 'پلتفرم خدمات دیجیتال پریمیوم MR.ROBOT',
    },
  },
]

async function main() {
  const role = await prisma.adminRole.upsert({
    where: { slug: 'super-admin' },
    update: { permissions: JSON.stringify(ALL_PERMISSIONS) },
    create: {
      name: 'مدیر ارشد',
      slug: 'super-admin',
      description: 'دسترسی کامل به پنل',
      permissions: JSON.stringify(ALL_PERMISSIONS),
    },
  })

  const email = process.env.ADMIN_SEED_EMAIL || 'admin@mrrobot.local'
  const password = process.env.ADMIN_SEED_PASSWORD
  if (!password || password.length < 8) {
    console.warn(
      'ADMIN_SEED_PASSWORD not set (min 8 chars). Skipping admin user creation.',
    )
  } else {
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash, roleId: role.id, isActive: true },
      create: {
        email,
        name: 'مدیر MR.ROBOT',
        passwordHash,
        roleId: role.id,
      },
    })
    console.log(`Admin ready: ${email}`)
  }

  for (const c of categories) {
    await prisma.productCategory.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    })
  }

  for (const p of products) {
    const category = await prisma.productCategory.findUnique({ where: { slug: p.cat } })
    if (!category) continue
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        nameFa: p.nameFa,
        nameEn: p.nameEn,
        description: p.description,
        detailsJson: JSON.stringify(p.details),
        featuresJson: JSON.stringify(p.features),
        isFeatured: p.featured,
        isVisible: true,
        categoryId: category.id,
      },
      create: {
        slug: p.slug,
        categoryId: category.id,
        nameFa: p.nameFa,
        nameEn: p.nameEn,
        description: p.description,
        detailsJson: JSON.stringify(p.details),
        featuresJson: JSON.stringify(p.features),
        isFeatured: p.featured,
        isVisible: true,
      },
    })
  }

  for (const [i, ai] of aiOfferings.entries()) {
    await prisma.aIServiceOffering.upsert({
      where: { slug: ai.slug },
      update: ai,
      create: { ...ai, sortOrder: i },
    })
  }

  for (const row of siteDefaults) {
    await prisma.siteContent.upsert({
      where: { key: row.key },
      update: { section: row.section, valueJson: JSON.stringify(row.value) },
      create: {
        key: row.key,
        section: row.section,
        valueJson: JSON.stringify(row.value),
      },
    })
  }

  await prisma.paymentGatewayConfig.upsert({
    where: { provider: 'zarinpal' },
    update: {},
    create: {
      provider: 'zarinpal',
      isEnabled: false,
      settings: JSON.stringify({ note: 'پیکربندی از پنل ادمین — کلیدها در سرور' }),
    },
  })

  await prisma.paymentGatewayConfig.upsert({
    where: { provider: 'sandbox' },
    update: {},
    create: {
      provider: 'sandbox',
      isEnabled: false,
      settings: JSON.stringify({ note: 'فقط dev با ALLOW_PAYMENT_SANDBOX=true' }),
    },
  })

  console.log('Seed completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
