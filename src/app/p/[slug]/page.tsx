import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import Image from 'next/image'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await prisma.sitePage.findFirst({
    where: { slug, status: 'PUBLISHED' },
  })
  if (!page) return { title: 'صفحه' }
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  }
}

export default async function CustomSitePage({ params }: Props) {
  const { slug } = await params
  const page = await prisma.sitePage.findFirst({
    where: { slug, status: 'PUBLISHED' },
  })
  if (!page) notFound()

  return (
    <article className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6">
      {page.heroImageUrl ? (
        <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-2xl border border-mr-border">
          <Image src={page.heroImageUrl} alt="" fill className="object-cover" sizes="100vw" />
        </div>
      ) : null}
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div
        className="prose prose-invert mt-8 max-w-none text-mr-muted"
        dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
      />
    </article>
  )
}
