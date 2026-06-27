'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import type { FloatingWin } from '../store/command-center-store'
import { cn } from '@/lib/utils'

export interface WinRect {
  x: number
  y: number
  w: number
  h: number
}

/** Media (imágenes en cuadrícula o video de YouTube embebido). */
function MediaView({ media }: { media: NonNullable<FloatingWin['media']> }) {
  const [sel, setSel] = useState(0)

  if (media.kind === 'video') {
    const cur = media.items[Math.min(sel, media.items.length - 1)]
    return (
      <div className="space-y-2">
        <div className="relative w-full overflow-hidden rounded-lg bg-black/40" style={{ aspectRatio: '16 / 9' }}>
          {cur?.id && (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${cur.id}`}
              title={cur.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
        {media.items.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {media.items.map((it, i) => (
              <button
                key={it.id ?? i}
                type="button"
                onClick={() => setSel(i)}
                className={cn('shrink-0 overflow-hidden rounded border', i === sel ? 'border-accent' : 'border-hairline')}
                title={it.title || `Video ${i + 1}`}
                aria-label={it.title || `Ver video ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`} alt="" className="h-12 w-20 object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Imágenes
  return (
    <div className="grid grid-cols-2 gap-2">
      {media.items.map((it, i) => (
        <a
          key={i}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-hairline bg-white/[0.03]"
          title={it.title || `Abrir imagen ${i + 1} en nueva pestaña`}
          aria-label={it.title || `Abrir imagen ${i + 1} en nueva pestaña`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={it.url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-28 w-full object-cover"
            onError={(e) => {
              const a = e.currentTarget.closest('a')
              if (a) a.style.display = 'none'
            }}
          />
        </a>
      ))}
    </div>
  )
}

/** Ventana del mosaico: posición/tamaño los calcula WindowsLayer (tiling). Se anima al recomponerse. */
export function FloatingWindow({ win, rect }: { win: FloatingWin; rect: WinRect }) {
  const removeWindow = useCommandCenter((s) => s.removeWindow)
  const hasMedia = !!win.media && win.media.items.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      animate={{ opacity: 1, scale: 1, x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', damping: 28, stiffness: 240 }}
      className="glass glass-accent pointer-events-auto absolute left-0 top-0 flex flex-col overflow-hidden rounded-2xl shadow-panel"
      // Más opaca que .glass para que el contenido se lea sobre el cerebro brillante.
      style={{ background: 'linear-gradient(180deg, rgba(13,20,36,0.93), rgba(9,15,28,0.9))' }}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'rgb(var(--hermes-accent))' }} />
        <span className="flex-1 truncate text-[11px] font-medium uppercase tracking-wider text-slate-200">
          {win.title}
        </span>
        {win.web && (
          <span className="rounded-full border border-state-normal/40 px-1.5 text-[8px] uppercase text-state-normal">web</span>
        )}
        {win.sources && (
          <span className="rounded-full border border-state-info/30 px-1.5 text-[8px] uppercase text-state-info">fuentes</span>
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
        {hasMedia ? (
          <MediaView media={win.media!} />
        ) : win.content ? (
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
            {win.media ? 'Buscando…' : 'Hermes está respondiendo…'}
          </p>
        )}
      </div>
    </motion.div>
  )
}
