'use client'

import { Volume2, VolumeX, Settings, Cpu, ShieldAlert, Presentation, LayoutGrid, Activity, Database, Ear, Camera } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import type { Mode } from '../types'
import { cn } from '@/lib/utils'

const MODES: { key: Mode; label: string; icon: React.ReactNode }[] = [
  { key: 'normal', label: 'Normal', icon: <Activity className="h-3.5 w-3.5" /> },
  { key: 'war_room', label: 'War Room', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { key: 'crisis', label: 'Crisis', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  { key: 'presentation', label: 'Presentación', icon: <Presentation className="h-3.5 w-3.5" /> },
]

export function StatusBar() {
  const {
    mode,
    setMode,
    voiceOutput,
    toggleVoiceOutput,
    personalization,
    lastModel,
    setPersonalizationOpen,
    setKnowledgeOpen,
    knowledgeCount,
    wakeWordEnabled,
    toggleWakeWord,
    visionEnabled,
    toggleVision,
  } = useCommandCenter()

  const name = personalization?.assistantName ?? 'Hermes'
  const org = personalization?.orgName ?? 'Centro de Mando'
  const flag = personalization?.countryFlag ?? '🇲🇽'

  return (
    <header className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg glass glass-accent text-lg">
          {flag}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">
            {name} <span className="accent">Command Center</span>
          </div>
          <div className="text-[11px] text-slate-400">{org} · Inteligencia estratégica</div>
        </div>
      </div>

      {/* Modos operativos */}
      <div className="hidden items-center gap-1 rounded-full glass px-1.5 py-1 md:flex">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            aria-pressed={mode === m.key}
            aria-label={`Modo ${m.label}`}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              mode === m.key ? 'bg-white/10 text-white shadow-glow' : 'text-slate-400 hover:text-slate-200',
            )}
            title={`Modo ${m.label}`}
          >
            {m.icon}
            <span className="hidden lg:inline">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] text-slate-400 sm:flex">
          <Cpu className="h-3.5 w-3.5 accent" />
          {lastModel === 'powerful'
            ? 'Opus 4.1'
            : lastModel === 'balanced'
              ? 'Sonnet 4.5'
              : lastModel === 'realtime'
                ? 'Sonar · web'
                : 'Consejo IA'}
        </span>
        <button
          type="button"
          onClick={() => setKnowledgeOpen(true)}
          className="flex items-center gap-1.5 rounded-lg glass px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Centro de Datos (base de conocimiento RAG)"
          aria-label="Abrir Centro de Datos"
        >
          <Database className="h-3.5 w-3.5 accent" aria-hidden="true" />
          <span className="hidden sm:inline">Datos</span>
          {knowledgeCount.documents > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-white">
              {knowledgeCount.documents}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={toggleVision}
          aria-pressed={visionEnabled}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg glass transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            visionEnabled && 'glass-accent',
          )}
          title={visionEnabled ? 'Visión activa (cámara)' : 'Activar visión (opt-in, cámara local)'}
          aria-label="Visión por cámara (opt-in)"
        >
          <Camera className={cn('h-4 w-4', visionEnabled ? 'accent' : 'text-slate-400')} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggleWakeWord}
          aria-pressed={wakeWordEnabled}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg glass transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            wakeWordEnabled && 'glass-accent',
          )}
          title={wakeWordEnabled ? 'Manos libres activo — di "Hermes"' : 'Activar manos libres (di "Hermes")'}
          aria-label='Manos libres por voz (di "Hermes")'
        >
          <Ear className={cn('h-4 w-4', wakeWordEnabled ? 'accent' : 'text-slate-400')} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggleVoiceOutput}
          aria-pressed={voiceOutput}
          className="flex h-9 w-9 items-center justify-center rounded-lg glass transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title={voiceOutput ? 'Voz activada' : 'Voz silenciada'}
          aria-label="Voz de Hermes (leer respuestas)"
        >
          {voiceOutput ? <Volume2 className="h-4 w-4 accent" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
        </button>
        <button
          type="button"
          onClick={() => setPersonalizationOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg glass transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Personalización"
          aria-label="Abrir personalización"
        >
          <Settings className="h-4 w-4 text-slate-300" />
        </button>
      </div>
    </header>
  )
}
