'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function PageLoader() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 900)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-mr-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <span
              className="text-2xl font-bold tracking-widest"
              dir="ltr"
            >
              MR.ROBOT
            </span>
            <div className="h-0.5 w-24 overflow-hidden rounded-full bg-mr-border">
              <motion.div
                className="h-full bg-mr-red"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.75, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
