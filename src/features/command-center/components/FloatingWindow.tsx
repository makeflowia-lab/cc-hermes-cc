'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Maximize2, Minimize2 } from 'lucide-react'
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
function MediaView({ media, expanded, winId }: { media: NonNullable<FloatingWin['media']>; expanded: boolean; winId: string }) {
  const [sel, setSel] = useState(0)
  const [picked, setPicked] = useState(false)
  // Al ampliar, fija autoplay para que reducir NO recargue/detenga el video (key estable).
  useEffect(() => {
    if (expanded) setPicked(true)
  }, [expanded])
  // Gesto "deslizar mano abierta" → siguiente/anterior video (evento desde HandController).
  useEffect(() => {
    const onStep = (e: Event) => {
      const d = (e as CustomEvent).detail as { id: string; dir: number }
      if (d?.id !== winId) return
      const n = media.items.length
      if (!n) return
      setSel((s) => (s + (d.dir > 0 ? 1 : -1) + n) % n)
      setPicked(true)
    }
    window.addEventListener('hermes-media-step', onStep as EventListener)
    return () => window.removeEventListener('hermes-media-step', onStep as EventListener)
  }, [winId, media.items.length])

  if (media.kind === 'video') {
    const cur = media.items[Math.min(sel, media.items.length - 1)]
    // Reproduce automáticamente al ampliar o al elegir un video (gesto del usuario → el navegador lo permite).
    const autoplay = expanded || picked ? '&autoplay=1' : ''
    return (
      <div className="flex h-full flex-col gap-2">
        <div className={cn('relative w-full overflow-hidden rounded-lg bg-black/40', expanded && 'flex-1')} style={expanded ? undefined : { aspectRatio: '16 / 9' }}>
          {cur?.id && (
            <iframe
              key={cur.id + (autoplay ? '-a' : '')}
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${cur.id}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1${autoplay}`}
              title={cur.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
                onClick={() => {
                  setSel(i)
                  setPicked(true)
                }}
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
    <div className={cn('grid gap-2', expanded ? 'grid-cols-3' : 'grid-cols-2')}>
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
            className={cn('w-full object-cover', expanded ? 'h-44' : 'h-28')}
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
export function FloatingWindow({ win, rect, expanded = false }: { win: FloatingWin; rect: WinRect; expanded?: boolean }) {
  const removeWindow = useCommandCenter((s) => s.removeWindow)
  const setExpandedId = useCommandCenter((s) => s.setExpandedId)
  const hasMedia = !!win.media && win.media.items.length > 0
  const hasMap = !!win.map
  const canExpand = hasMedia || hasMap || !!win.content

  return (
    <motion.div
      data-win-id={win.id}
      initial={{ opacity: 0, scale: 0.96, x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      animate={{ opacity: 1, scale: 1, x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      exit={{ opacity: 0, scale: 0.94 }}
      // Al manipular con las manos (pos/size) sigue casi al instante; en el mosaico, resorte suave.
      transition={(win.pos || win.size) && !expanded ? { type: 'tween', duration: 0.06, ease: 'linear' } : { type: 'spring', damping: 28, stiffness: 240 }}
      className="glass glass-accent pointer-events-auto absolute left-0 top-0 flex flex-col overflow-hidden rounded-2xl shadow-panel"
      // Más opaca que .glass para que el contenido se lea sobre el cerebro brillante. zIndex alto si está ampliada.
      style={{ background: 'linear-gradient(180deg, rgba(13,20,36,0.93), rgba(9,15,28,0.9))', zIndex: expanded ? 50 : undefined }}
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
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpandedId(expanded ? null : win.id)}
            title={expanded ? 'Reducir' : 'Ampliar (zoom)'}
            aria-label={expanded ? 'Reducir ventana' : 'Ampliar ventana'}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-accent"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
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

      <div className={cn('flex-1 overflow-y-auto text-sm leading-relaxed text-slate-100', hasMap || (hasMedia && win.media!.kind === 'video') ? 'p-0' : 'px-4 py-3')}>
        {hasMap ? (
          <div className="flex h-full flex-col">
            <iframe
              src={win.map!.embedUrl}
              title={win.map!.label}
              className="h-full min-h-[220px] w-full flex-1 border-0"
              loading="lazy"
            />
            <a
              href={win.map!.linkUrl || win.map!.embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate border-t border-hairline px-3 py-1.5 text-[10px] text-slate-400 hover:text-accent"
              title={win.map!.label}
            >
              {win.map!.label} · ampliar ↗
            </a>
          </div>
        ) : hasMedia ? (
          <div className={cn('h-full', win.media!.kind === 'video' ? 'p-2' : '')}>
            <MediaView media={win.media!} expanded={expanded} winId={win.id} />
          </div>
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
            {win.media || win.map ? 'Buscando…' : 'Hermes está respondiendo…'}
          </p>
        )}
      </div>
    </motion.div>
  )
}
