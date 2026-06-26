'use client'

import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { COUNCIL, ALL_SPECIALISTS } from '@/core/council'
import { useCommandCenter } from '../store/command-center-store'
import { cn } from '@/lib/utils'

const INTENT_LABEL: Record<string, string> = {
  small_talk: 'Conversación',
  consulta_simple: 'Consulta',
  analisis_estrategico: 'Análisis estratégico',
  simulacion: 'Simulación',
  crisis: 'Crisis',
  exploracion: 'Investigación',
  accion_operativa: 'Comando operativo',
  briefing: 'Informe estratégico',
}

const URGENCY_COLOR: Record<string, string> = {
  low: 'text-state-normal',
  medium: 'text-state-info',
  high: 'text-state-warning',
  critical: 'text-state-crisis',
}

export function CouncilIndicator() {
  const { activeSpecialists, lastIntent, lastUrgency } = useCommandCenter()
  const active = new Set(activeSpecialists)

  return (
    <div className="glass scanline relative overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
          <Users className="h-4 w-4 accent" />
          Consejo Estratégico
        </div>
        {lastIntent && (
          <span className={cn('text-[11px] font-medium', URGENCY_COLOR[lastUrgency ?? 'medium'])}>
            {INTENT_LABEL[lastIntent] ?? lastIntent}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ALL_SPECIALISTS.map((key) => {
          const isActive = active.has(key)
          return (
            <motion.span
              key={key}
              animate={isActive ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 1.4, repeat: isActive ? Infinity : 0 }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10.5px] transition',
                isActive
                  ? 'glass-accent text-white'
                  : 'border-hairline bg-white/[0.02] text-slate-500',
              )}
              title={COUNCIL[key].lens}
            >
              {COUNCIL[key].name}
            </motion.span>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Cada respuesta es la síntesis de los especialistas relevantes. El usuario nunca ve el proceso interno.
      </p>
    </div>
  )
}
