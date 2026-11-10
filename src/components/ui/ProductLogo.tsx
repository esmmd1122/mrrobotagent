type ProductSlug = 'chatgpt-plus' | 'capcut-pro' | 'grok' | 'gemini-pro'

const logoMeta: Record<ProductSlug, { label: string; accent: string }> = {
  'chatgpt-plus': { label: 'GPT', accent: '#10a37f' },
  'capcut-pro': { label: 'CC', accent: '#00c4ff' },
  grok: { label: 'G', accent: '#f5f5f5' },
  'gemini-pro': { label: '✦', accent: '#4285f4' },
}

export function ProductLogo({ slug }: { slug: ProductSlug }) {
  const { label, accent } = logoMeta[slug]

  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-mr-border bg-mr-black text-lg font-bold"
      style={{ boxShadow: `inset 0 0 24px ${accent}22` }}
      aria-hidden
    >
      <span style={{ color: accent }} dir="ltr">
        {label}
      </span>
    </div>
  )
}
