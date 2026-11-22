'use client'

const CHAPTERS = [
  { id: 'hero', label: '۰۱ آغاز' },
  { id: 'intro', label: '۰۲ هویت برند' },
  { id: 'ai-builder', label: '۰۳ پروژه هوش مصنوعی' },
  { id: 'marketplace', label: '۰۴ فروشگاه سه‌بعدی' },
  { id: 'ai-experience', label: '۰۵ فناوری هوش مصنوعی' },
  { id: 'apple-mobile', label: '۰۶ اپل و موبایل' },
  { id: 'trust', label: '۰۷ اعتماد و پشتیبانی' },
  { id: 'finale', label: '۰۸ پرده پایانی' },
] as const

type Props = {
  activeSceneId: string
  reducedMotion: boolean
}

export function ChapterRail({ activeSceneId, reducedMotion }: Props) {
  return (
    <aside className="cinema-chapter-rail" aria-label="سکانس‌های صفحه">
      {CHAPTERS.map((chapter) => {
        const isActive = activeSceneId === chapter.id
        return (
          <button
            key={chapter.id}
            type="button"
            className={`cinema-chapter-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => {
              const el = document.getElementById(chapter.id)
              if (el) {
                el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
              }
            }}
            aria-current={isActive ? 'true' : undefined}
          >
            <span className="pip" />
            <span className="chapter-name">{chapter.label}</span>
          </button>
        )
      })}
    </aside>
  )
}
