'use client'

import { motion } from 'framer-motion'

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  align?: 'center' | 'start'
  titleEn?: string
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'start',
  titleEn,
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center items-center' : 'text-start items-start'

  return (
    <motion.header
      className={`flex flex-col gap-3 max-w-3xl ${alignClass}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {eyebrow ? (
        <span className="text-xs font-medium tracking-widest text-mr-red uppercase">
          {eyebrow}
        </span>
      ) : null}
      {titleEn ? (
        <span className="font-mono text-sm text-mr-muted" dir="ltr">
          {titleEn}
        </span>
      ) : null}
      <h2 className="text-3xl sm:text-4xl font-bold text-balance text-white">{title}</h2>
      {description ? (
        <p className="text-base sm:text-lg text-mr-muted leading-relaxed">{description}</p>
      ) : null}
    </motion.header>
  )
}
