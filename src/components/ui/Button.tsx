'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'

const variantClass: Record<Variant, string> = {
  primary:
    'bg-mr-red text-white shadow-lg shadow-mr-red/25 hover:bg-[#ff1a14] border border-mr-red/50',
  secondary:
    'bg-mr-surface text-white border border-mr-border hover:border-mr-red/40 hover:bg-mr-charcoal',
  ghost: 'bg-transparent text-white/90 hover:text-white hover:bg-white/5',
  outline:
    'bg-transparent text-mr-red border border-mr-red/60 hover:bg-mr-red/10',
}

type ButtonProps = {
  href?: string
  onClick?: () => void
  children: ReactNode
  variant?: Variant
  className?: string
  type?: 'button' | 'submit'
  ariaLabel?: string
  style?: CSSProperties
}

export function Button({
  href,
  onClick,
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ariaLabel,
  style,
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mr-red'

  const classes = `${base} ${variantClass[variant]} ${className}`

  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Link href={href} className={classes} aria-label={ariaLabel} style={style}>
          {children}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
      style={style}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  )
}
