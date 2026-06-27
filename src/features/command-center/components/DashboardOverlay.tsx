'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LayoutGrid } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import { useModalA11y } from '../hooks/useModalA11y'
import { CouncilIndicator } from './CouncilIndicator'
import { WidgetGrid } from './WidgetGrid'

/** Tablero invocable (consejo + monitores) como overlay — "el usuario lo llama a través de Hermes". */
export function DashboardOverlay() {
  const dashboardOpen = useCommandCenter((s) => s.dashboardOpen)
  const setDashboardOpen = useCommandCenter((s) => s.setDashboardOpen)
  const ref = useRef<HTMLElement>(null)
  useModalA11y(dashboardOpen, () => setDashboardOpen(false), ref)

  return (
    <AnimatePresence>
      {dashboardOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDashboardOpen(false)}
          />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Tablero"
            className="glass fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col gap-3 overflow-y-auto p-5"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
                <LayoutGrid className="h-4 w-4 accent" aria-hidden="true" />
                Tablero
              </div>
              <button
                type="button"
                onClick={() => setDashboardOpen(false)}
                title="Cerrar"
                aria-label="Cerrar tablero"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <CouncilIndicator />
            <WidgetGrid />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
