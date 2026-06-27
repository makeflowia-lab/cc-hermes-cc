'use client'

import { useEffect, useState } from 'react'
import { BRAIN_REGIONS } from '../brain-regions'
import type { HermesState } from '../types'

/**
 * Etiquetas de regiones (estilo Z.E.R.O.). Las regiones ACTIVAS (que Hermes está consultando)
 * se iluminan y disparan más fuerte → "pides que busque y ves dónde lo encuentra".
 */

const NEURONS = [240, 200, 180, 160, 150, 170, 140, 130, 120]
const FIRING_BASE: Record<HermesState, number> = {
  idle: 0.22,
  listening: 0.5,
  processing: 0.8,
  responding: 0.7,
}

export function BrainLabels({ state, activeRegions }: { state: HermesState; activeRegions?: number[] }) {
  const [firing, setFiring] = useState<number[]>(() => BRAIN_REGIONS.map(() => 0.35))
  const active = new Set(activeRegions ?? [])

  useEffect(() => {
    const base = FIRING_BASE[state]
    const id = setInterval(() => {
      setFiring(
        BRAIN_REGIONS.map((_, i) => {
          const boost = active.has(i) ? 0.35 : 0
          return Math.max(0.05, Math.min(0.99, base + boost + (Math.random() - 0.5) * 0.4))
        }),
      )
    }, 600)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, activeRegions])

  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
      {BRAIN_REGIONS.map((r, i) => {
        const rad = (r.angle * Math.PI) / 180
        const left = 50 + Math.cos(rad) * 43
        const top = 50 + Math.sin(rad) * 41
        const onLeft = Math.cos(rad) < -0.15
        const onRight = Math.cos(rad) > 0.15
        const translate = onLeft ? 'translate(-100%, -50%)' : onRight ? 'translate(0, -50%)' : 'translate(-50%, -50%)'
        const align = onLeft ? 'items-end text-right' : onRight ? 'items-start text-left' : 'items-center text-center'
        const isActive = active.has(i)
        return (
          <div
            key={r.name}
            className={`absolute flex flex-col transition-all duration-300 ${align}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: `${translate} scale(${isActive ? 1.08 : 1})`,
              opacity: isActive ? 1 : 0.82,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full transition-all"
                style={{
                  background: r.color,
                  boxShadow: `0 0 ${isActive ? 14 : 8}px ${r.color}`,
                  transform: isActive ? 'scale(1.6)' : 'scale(1)',
                }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: isActive ? r.color : '#e2e8f0', textShadow: isActive ? `0 0 10px ${r.color}` : 'none' }}
              >
                {r.name}
              </span>
            </div>
            <span className="text-[9px] text-slate-400">{r.sub}</span>
            <span className="font-mono text-[9px]" style={{ color: r.color }}>
              {NEURONS[i]} neuronas · firing {firing[i].toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
