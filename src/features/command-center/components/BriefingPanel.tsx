'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Bell,
  CalendarClock,
  EyeOff,
  ListChecks,
} from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import { useModalA11y } from '../hooks/useModalA11y'
import type { BriefingItem } from '../types'
import { cn } from '@/lib/utils'

const KIND_META: Record<BriefingItem['kind'], { icon: React.ReactNode; label: string }> = {
  riesgo: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Riesgo' },
  oportunidad: { icon: <Lightbulb className="h-3.5 w-3.5" />, label: 'Oportunidad' },
  tendencia: { icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Tendencia' },
  alerta: { icon: <Bell className="h-3.5 w-3.5" />, label: 'Alerta' },
  agenda: { icon: <CalendarClock className="h-3.5 w-3.5" />, label: 'Agenda' },
  tema_sensible: { icon: <EyeOff className="h-3.5 w-3.5" />, label: 'Tema sensible' },
}

const SEVERITY: Record<BriefingItem['severity'], string> = {
  info: 'text-state-info border-state-info/30',
  positive: 'text-state-normal border-state-normal/30',
  warning: 'text-state-warning border-state-warning/30',
  critical: 'text-state-crisis border-state-crisis/40',
}

export function BriefingPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  // El fetch lo dispara CommandCenter en segundo plano; aquí solo renderizamos.
  const { briefing, briefingLoading } = useCommandCenter()
  const dialogRef = useRef<HTMLDivElement>(null)
  useModalA11y(open, onClose, dialogRef)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hermes-briefing-title"
            className="glass glass-accent relative w-full max-w-2xl rounded-3xl p-6"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              title="Cerrar informe"
              aria-label="Cerrar informe"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] accent">
              <Sparkles className="h-4 w-4" />
              Informe Estratégico del Día
            </div>

            {briefingLoading && (
              <div className="space-y-3" aria-live="polite" aria-busy="true">
                <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-full animate-pulse rounded bg-white/5" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/5" />
                <p className="pt-2 text-sm text-slate-400">El consejo está preparando tu informe…</p>
              </div>
            )}

            {!briefingLoading && !briefing && (
              <p className="text-sm text-slate-400">
                No se pudo generar el informe en este momento. Puedes preguntarle directamente a Hermes:
                “¿qué debo hacer hoy?”.
              </p>
            )}

            {!briefingLoading && briefing && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-300">{briefing.greeting}</p>
                  <h2
                    id="hermes-briefing-title"
                    className="mt-1 text-xl font-semibold leading-snug text-white text-glow"
                  >
                    {briefing.headline}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{briefing.summary}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {briefing.items.map((it, i) => (
                    <div
                      key={i}
                      className={cn('rounded-xl border bg-white/[0.02] p-3', SEVERITY[it.severity])}
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                        {KIND_META[it.kind].icon}
                        {KIND_META[it.kind].label}
                      </div>
                      <div className="text-sm font-medium text-slate-100">{it.title}</div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{it.detail}</p>
                    </div>
                  ))}
                </div>

                {briefing.priorityActions.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-300">
                      <ListChecks className="h-4 w-4 accent" />
                      Acciones prioritarias
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-200">
                      {briefing.priorityActions.map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="accent">{i + 1}.</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="glass-accent rounded-xl p-3">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.2em] accent">¿Qué debo hacer hoy?</div>
                  <p className="text-sm leading-relaxed text-slate-100">{briefing.whatToDoToday}</p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
