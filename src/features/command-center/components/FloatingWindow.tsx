'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, GripHorizontal } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import type { FloatingWin } from '../store/command-center-store'

// Contador global para traer la ventana enfocada al frente.
let topZ = 20

/** Ventana flotante, arrastrable (DOC Módulo 1: widgets flotantes / multipantalla). */
export function FloatingWindow({ win, index }: { win: FloatingWin; index: number }) {
  const removeWindow = useCommandCenter((s) => s.removeWindow)
  const [pos, setPos] = useState(() => ({ x: 70 + (index % 6) * 38, y: 80 + (index % 6) * 38 }))
  const [z, setZ] = useState(() => ++topZ)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const bringFront = () => setZ(++topZ)

  const onPointerDown = (e: React.PointerEvent) => {
    bringFront()
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className="glass glass-accent pointer-events-auto absolute flex max-h-[60vh] w-[22rem] flex-col overflow-hidden rounded-2xl shadow-panel"
      style={{ left: pos.x, top: pos.y, zIndex: z }}
      onMouseDown={bringFront}
    >
      {/* Barra de título (arrastrable) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center gap-2 border-b border-hairline px-3 py-2 active:cursor-grabbing"
      >
        <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
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

      {/* Contenido */}
      <div className="overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-100">
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
