'use client'

import { motion } from 'framer-motion'
import { BarChart3, Radio, AlertTriangle, CalendarClock, Map } from 'lucide-react'

/**
 * Monitores del centro de mando. En Fase 1 NO hay fuentes en vivo (encuestas/redes/noticias
 * llegan en Fase 2 vía RAG). Los widgets se muestran "vivos" pero etiquetados con honestidad.
 * Valores deterministas (sin Math.random) para evitar mismatch de hidratación.
 */

function Monitor({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="glass scanline relative overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
          <span className="accent">{icon}</span>
          {title}
        </div>
        <span className="rounded-full border border-hairline bg-white/[0.02] px-2 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">
          Fuente en vivo · Fase 2
        </span>
      </div>
      {children}
    </div>
  )
}

const SPARK = [18, 22, 19, 26, 24, 30, 28, 34, 31, 38, 36, 41]

function Encuestas() {
  const max = Math.max(...SPARK)
  const pts = SPARK.map((v, i) => `${(i / (SPARK.length - 1)) * 100},${40 - (v / max) * 36}`).join(' ')
  return (
    <Monitor title="Intención de voto" icon={<BarChart3 className="h-4 w-4" />}>
      <svg viewBox="0 0 100 40" className="h-16 w-full" preserveAspectRatio="none">
        <polyline
          points={pts}
          fill="none"
          stroke="rgb(var(--hermes-accent))"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <motion.circle
          r="1.8"
          fill="rgb(var(--hermes-accent))"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          cx="100"
          cy={40 - (SPARK[SPARK.length - 1] / max) * 36}
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>Serie histórica</span>
        <span className="text-state-normal">tendencia estable</span>
      </div>
    </Monitor>
  )
}

function Sentimiento() {
  const bars = [
    { label: 'Positivo', v: 52, color: '#34d399' },
    { label: 'Neutro', v: 30, color: '#64748b' },
    { label: 'Negativo', v: 18, color: '#f43f5e' },
  ]
  return (
    <Monitor title="Sentimiento en redes" icon={<Radio className="h-4 w-4" />}>
      <div className="space-y-2">
        {bars.map((b) => (
          <div key={b.label} className="text-[10px]">
            <div className="mb-0.5 flex justify-between text-slate-400">
              <span>{b.label}</span>
              <span>{b.v}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: b.color }}
                initial={{ width: 0 }}
                animate={{ width: `${b.v}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </Monitor>
  )
}

function Alertas() {
  const items = [
    { t: 'Sin anomalías críticas', s: 'normal' as const },
    { t: 'Monitoreo de rumores activo', s: 'info' as const },
  ]
  const color = { normal: 'text-state-normal', info: 'text-state-info', warning: 'text-state-warning' }
  return (
    <Monitor title="Detección de crisis" icon={<AlertTriangle className="h-4 w-4" />}>
      <ul className="space-y-2 text-[11px]">
        {items.map((it) => (
          <li key={it.t} className="flex items-center gap-2 text-slate-300">
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${color[it.s]}`} />
            {it.t}
          </li>
        ))}
      </ul>
    </Monitor>
  )
}

function Agenda() {
  const items = ['09:00 · Reunión de estrategia', '13:00 · Gira distrito 5', '18:00 · Entrevista medios']
  return (
    <Monitor title="Agenda del día" icon={<CalendarClock className="h-4 w-4" />}>
      <ul className="space-y-1.5 text-[11px] text-slate-300">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2">
            <span className="accent">▸</span>
            {it}
          </li>
        ))}
      </ul>
    </Monitor>
  )
}

function MapaPlaceholder() {
  return (
    <Monitor title="Mapa territorial" icon={<Map className="h-4 w-4" />}>
      <div className="relative h-20 overflow-hidden rounded-lg border border-hairline bg-white/[0.02]">
        <div className="holo-grid absolute inset-0 opacity-60" />
        <motion.div
          className="absolute left-1/3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
          style={{ background: 'rgb(var(--hermes-accent))' }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.6, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
        <motion.div
          className="absolute right-1/4 top-1/3 h-2 w-2 rounded-full bg-state-warning"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">Distritos y secciones · mapa de calor</p>
    </Monitor>
  )
}

export function WidgetGrid() {
  return (
    <div className="grid grid-cols-1 gap-3">
      <Encuestas />
      <Sentimiento />
      <Alertas />
      <Agenda />
      <MapaPlaceholder />
    </div>
  )
}
