'use client'

import { AnimatePresence } from 'framer-motion'
import { useCommandCenter } from '../store/command-center-store'
import { FloatingWindow } from './FloatingWindow'

/** Capa de ventanas flotantes sobre el cerebro (tantas como se pidan). */
export function WindowsLayer() {
  const windows = useCommandCenter((s) => s.windows)
  if (windows.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <AnimatePresence>
        {windows.map((w, i) => (
          <FloatingWindow key={w.id} win={w} index={i} />
        ))}
      </AnimatePresence>
    </div>
  )
}
