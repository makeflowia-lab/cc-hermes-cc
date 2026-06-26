'use client'

import { motion } from 'framer-motion'
import type { HermesState } from '../types'

const LABEL: Record<HermesState, string> = {
  idle: 'En espera',
  listening: 'Escuchando',
  processing: 'Razonando',
  responding: 'Respondiendo',
}

/** El "estado de atención" de Hermes (DOC visión §"Una idea que puede diferenciar el producto"). */
export function HermesOrb({ state, speaking }: { state: HermesState; speaking: boolean }) {
  const active = state !== 'idle'
  return (
    <div className="relative flex flex-col items-center gap-3 select-none">
      <div className="relative h-40 w-40">
        {/* Anillos de pulso cuando escucha o responde */}
        {(state === 'listening' || speaking) &&
          [0, 0.8, 1.6].map((delay) => (
            <span
              key={delay}
              className="absolute inset-0 rounded-full border"
              style={{
                borderColor: 'rgb(var(--hermes-accent) / 0.5)',
                animation: `pulse-ring 2.4s ease-out ${delay}s infinite`,
              }}
            />
          ))}

        {/* Anillo orbital giratorio (procesando) */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: 'rgb(var(--hermes-accent))',
            borderRightColor: 'rgb(var(--hermes-accent) / 0.3)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: state === 'processing' ? 1.4 : 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Núcleo */}
        <motion.div
          className="absolute inset-6 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, rgb(var(--hermes-accent) / 0.95), rgb(var(--hermes-accent) / 0.25) 55%, transparent 75%)',
            boxShadow: '0 0 60px -6px rgb(var(--hermes-accent) / 0.6)',
          }}
          animate={
            active
              ? { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }
              : { scale: [1, 1.03, 1], opacity: [0.55, 0.75, 0.55] }
          }
          transition={{ duration: active ? 1.6 : 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Centro */}
        <div className="absolute inset-[3.75rem] rounded-full bg-white/85 blur-[1px]" />
      </div>

      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: active ? 'rgb(var(--hermes-accent))' : '#475569' }}
        />
        {LABEL[state]}
      </div>
    </div>
  )
}
