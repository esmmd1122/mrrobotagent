'use client'

import { useEffect, useState } from 'react'

type Props = {
  ready?: boolean
}

const STEPS = [
  { p: 36, t: 'تولید بافت پارچه و نورپردازی استودیویی...' },
  { p: 74, t: 'تنظیم دوربین سینمایی و لایه‌های عمق...' },
  { p: 100, t: 'خوش آمدید به دنیای MR.ROBOT' },
]

export function PageLoader({ ready = false }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setHidden(true)
      return
    }

    const t1 = setTimeout(() => setStepIndex(1), 160)
    const t2 = setTimeout(() => setStepIndex(2), 340)
    // Failsafe guarantee so the preloader never blocks rendering
    const failsafe = setTimeout(() => setHidden(true), 1250)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(failsafe)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    setStepIndex(2)
    const done = setTimeout(() => setHidden(true), 240)
    return () => clearTimeout(done)
  }, [ready])

  const step = STEPS[stepIndex] ?? STEPS[2]

  return (
    <div
      className={`cinema-preloader ${hidden ? 'is-hidden' : ''}`}
      aria-hidden={hidden}
    >
      <div className="cinema-preloader-mark">
        <div className="cinema-preloader-eyes">
          <span />
          <span />
        </div>
        <span>MR.ROBOT</span>
      </div>
      <div className="cinema-preloader-track">
        <div className="cinema-preloader-fill" style={{ width: `${step.p}%` }} />
      </div>
      <div className="cinema-preloader-note">{step.t}</div>
    </div>
  )
}
