'use client'

import dynamic from 'next/dynamic'
import { BrainLabels } from './BrainLabels'
import { regionsForSpecialists } from '../brain-regions'
import type { HermesState, SpecialistKey } from '../types'
import type { BrainVariant } from './NeuralBrain'

// El cerebro usa WebGL → solo en cliente (sin SSR).
const NeuralBrain = dynamic(() => import('./NeuralBrain').then((m) => m.NeuralBrain), { ssr: false })

const STATUS: Record<HermesState, string> = {
  idle: 'En espera',
  listening: 'Escuchando',
  processing: 'Buscando…',
  responding: 'Respondiendo',
}

export function BrainCenterpiece({
  state,
  activeSpecialists,
  compact = false,
  fill = false,
  variant = 'aurora',
}: {
  state: HermesState
  activeSpecialists?: SpecialistKey[]
  compact?: boolean
  fill?: boolean
  variant?: BrainVariant
}) {
  const activeRegions = regionsForSpecialists(activeSpecialists)

  // Modo inmersivo: el cerebro llena toda la pantalla, sin etiquetas ni textos.
  if (fill) {
    return <NeuralBrain state={state} activeRegions={activeRegions} variant={variant} className="absolute inset-0" />
  }

  const active = state !== 'idle'
  return (
    <div className={`relative mx-auto aspect-square w-full ${compact ? 'max-w-[8.5rem]' : 'max-w-[34rem]'}`}>
      <NeuralBrain state={state} activeRegions={activeRegions} variant={variant} className="absolute inset-0" />
      {!compact && <BrainLabels state={state} activeRegions={activeRegions} />}
      {!compact && (
        <div className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-300">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: active ? 'rgb(var(--hermes-accent))' : '#475569' }}
          />
          {STATUS[state]}
        </div>
      )}
    </div>
  )
}
