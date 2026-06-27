'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import type { FloatingWin } from '../store/command-center-store'

export interface WinRect {
  x: number
  y: number
  w: number
  h: number
}

/** Ventana del mosaico: posición/tamaño los calcula WindowsLayer (tiling). Se anima al recomponerse. */
export function FloatingWindow({ win, rect }: { win: FloatingWin; rect: WinRect }) {
  const removeWindow = useCommandCenter((s) => s.removeWindow)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      animate={{ opacity: 1, scale: 1, x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', damping: 28, stiffness: 240 }}
      className="glass glass-accent pointer-events-auto absolute left-0 top-0 flex flex-col overflow-hidden rounded-2xl shadow-panel"
      // Más opaca que .glass para que el texto se lea sobre el cerebro brillante.
      style={{ background: 'linear-gradient(180deg, rgba(13,20,36,0.93), rgba(9,15,28,0.9))' }}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full accent" style={{ background: 'rgb(var(--hermes-accent))' }} />
        <span className="flex-1 truncate text-[11px] font-medium uppercase tracking-wider text-slate-200">
          {win.title}
        </span>
        {win.web && (
          <span className="rounded-full border border-state-normal/40 px-1.5 text-[8px] uppercase text-state-normal">
            web
          </span>
        )}
        {win.sources && (
          <span className="rounded-full border border-state-info/30 px-1.5 text-[8px] uppercase text-state-info">
            fuentes
          </span>
        )}
        <button
          type="button"
          onClick={() => removeWindow(win.id)}
          title="Cerrar"
          aria-label={`Cerrar ${win.title}`}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-state-crisis"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-100">
        {win.content ? (
          <p className="whitespace-pre-wrap">{win.content}</p>
        ) : (
          <p className="flex items-center gap-2 text-slate-400">
            <span className="flex gap-1">
              {[0, 0.15, 0.3].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 rounded-full bg-current"
                  style={{ animation: `breathe 1.2s ease-in-out ${d}s infinite` }}
                />
              ))}
            </span>
            Hermes está respondiendo…
          </p>
        )}
      </div>
    </motion.div>
  )
}
