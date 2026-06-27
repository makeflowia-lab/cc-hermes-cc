'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Hand, Volume2, VolumeX, Maximize2, Minimize2, Settings } from 'lucide-react'
import { useHermes } from '../hooks/useHermes'
import { useCommandCenter } from '../store/command-center-store'
import { applyAccent } from '../theme'
import { cn } from '@/lib/utils'
import type { Tenant } from '../types'
import { AmbientBackground } from './AmbientBackground'
import { StatusBar } from './StatusBar'
import { BrainCenterpiece } from './BrainCenterpiece'
import type { BrainVariant } from './NeuralBrain'
import { CommandBar } from './CommandBar'
import { ConversationStream } from './ConversationStream'
import { CouncilIndicator } from './CouncilIndicator'
import { WidgetGrid } from './WidgetGrid'
import { BriefingPanel } from './BriefingPanel'
import { PersonalizationDrawer } from './PersonalizationDrawer'
import { KnowledgeDrawer } from './KnowledgeDrawer'
import { VisionPanel } from './VisionPanel'
import { DashboardOverlay } from './DashboardOverlay'
import { WindowsLayer } from './WindowsLayer'

export function CommandCenter() {
  const hermes = useHermes()
  const {
    setPersonalization,
    personalization,
    setBriefing,
    setBriefingLoading,
    setKnowledgeCount,
    mode,
    activeSpecialists,
    immersive,
    setImmersive,
    setBriefingOpen,
    briefingOpen,
    setPersonalizationOpen,
    voiceOutput,
    toggleVoiceOutput,
    clapEnabled,
    toggleClap,
    awake,
  } = useCommandCenter()

  // Personalización + acento
  useEffect(() => {
    fetch('/api/personalization')
      .then((r) => (r.ok ? r.json() : null))
      .then((t: Tenant | null) => {
        if (t && !('error' in t)) {
          setPersonalization(t)
          applyAccent(t.accentRgb)
        }
      })
      .catch(() => {})
  }, [setPersonalization])

  // Copiloto: genera el informe del día en segundo plano (listo para cuando lo invoquen). No abre nada.
  const briefingKicked = useRef(false)
  useEffect(() => {
    if (briefingKicked.current) return
    briefingKicked.current = true
    setBriefingLoading(true)
    fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setBriefing(data))
      .catch(() => setBriefing(null))
      .finally(() => setBriefingLoading(false))
  }, [setBriefing, setBriefingLoading])

  // Conteo de la base de conocimiento
  useEffect(() => {
    fetch('/api/knowledge')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.count && setKnowledgeCount(d.count))
      .catch(() => {})
  }, [setKnowledgeCount])

  const assistantName = personalization?.assistantName ?? 'Hermes'
  const brainVariant = (personalization?.brainVariant ?? 'aurora') as BrainVariant
  const busy = hermes.status === 'submitted' || hermes.status === 'streaming'

  // Los CONTROLES solo aparecen al mover el mouse (no al aplaudir/hablar). Por defecto: solo el cerebro.
  const [chromeVisible, setChromeVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reveal = useCallback(() => {
    setChromeVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setChromeVisible(false), 4000)
  }, [])
  useEffect(() => {
    if (!immersive) return
    const onActivity = () => reveal()
    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown', onActivity)
    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [immersive, reveal])

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-lg glass transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

  const commandBar = (
    <CommandBar
      onAsk={hermes.ask}
      onStartListening={hermes.startListening}
      onStopListening={hermes.stopListening}
      onStop={hermes.stop}
      listening={hermes.voice.listening}
      interim={hermes.voice.interim}
      sttSupported={hermes.voice.sttSupported}
      busy={busy}
      minimal={immersive}
    />
  )

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-screen w-screen overflow-hidden">
        <AmbientBackground />
        {mode === 'crisis' && (
          <div
            className="pointer-events-none fixed inset-0 z-20 animate-pulse"
            style={{ boxShadow: 'inset 0 0 160px -40px rgba(244,63,94,0.55)' }}
            aria-hidden="true"
          />
        )}

        {immersive ? (
          /* ---------------- MODO INMERSIVO: SOLO el cerebro (sin barra, sin textos) ---------------- */
          <div className="flex h-full flex-col">
            {/* Imagen de fondo (foto/logo/bandera) a pantalla completa; el cerebro queda DELANTE. */}
            {personalization?.backgroundImage && (
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${personalization.backgroundImage}")` }}
                />
                {/* Velo suave para que el cerebro resalte por delante. */}
                <div className="absolute inset-0 bg-black/25" />
              </div>
            )}
            {/* El cerebro llena toda la pantalla */}
            <BrainCenterpiece state={hermes.hermesState} activeSpecialists={activeSpecialists} variant={brainVariant} fill />

            {/* Controles: SOLO al mover el mouse (no al aplaudir/hablar). Voz-primero. */}
            <header
              className={cn(
                'absolute inset-x-0 top-0 z-30 flex items-center justify-end px-5 py-3 transition-opacity duration-500',
                chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleClap}
                  className={cn(iconBtn, clapEnabled && 'glass-accent')}
                  title={clapEnabled ? 'Activación por 2 aplausos: ON' : 'Activación por 2 aplausos: OFF'}
                  aria-label="Activación por doble aplauso"
                >
                  <Hand className={cn('h-4 w-4', clapEnabled ? 'accent' : 'text-slate-400')} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={toggleVoiceOutput}
                  className={iconBtn}
                  title={voiceOutput ? 'Voz de Hermes: ON' : 'Voz de Hermes: OFF'}
                  aria-label="Voz de Hermes"
                >
                  {voiceOutput ? <Volume2 className="h-4 w-4 accent" aria-hidden="true" /> : <VolumeX className="h-4 w-4 text-slate-500" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => setPersonalizationOpen(true)}
                  className={iconBtn}
                  title="Personalización"
                  aria-label="Abrir personalización"
                >
                  <Settings className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setImmersive(false)}
                  className={iconBtn}
                  title="Abrir tablero completo"
                  aria-label="Abrir tablero completo"
                >
                  <Maximize2 className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* STANDBY: SOLO el cerebro. Clic/tap o 2 aplausos activan (sin ícono ni texto). */}
            {!awake && (
              <button
                type="button"
                onClick={hermes.activate}
                className="absolute inset-0 z-10 cursor-pointer bg-transparent"
                aria-label="Activar Hermes (aplaude dos veces o toca la pantalla)"
              />
            )}
          </div>
        ) : (
          /* ---------------- TABLERO COMPLETO ---------------- */
          <div className="flex h-full flex-col">
            <StatusBar />
            <main className="grid flex-1 grid-cols-1 gap-4 overflow-hidden px-4 pb-4 lg:grid-cols-[1fr_22rem]">
              <section className="flex min-h-0 flex-col">
                <div className="flex items-center justify-between py-2">
                  <BrainCenterpiece state={hermes.hermesState} activeSpecialists={activeSpecialists} variant={brainVariant} compact />
                  <button
                    type="button"
                    onClick={() => setImmersive(true)}
                    className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    title="Volver al modo inmersivo (solo el cerebro)"
                  >
                    <Minimize2 className="h-3.5 w-3.5 accent" aria-hidden="true" />
                    Solo el cerebro
                  </button>
                </div>
                <ConversationStream
                  messages={hermes.messages}
                  processing={hermes.status === 'submitted'}
                  assistantName={assistantName}
                />
                <div className="mx-auto w-full max-w-3xl pt-2">
                  {commandBar}
                  {hermes.error && (
                    <p role="alert" className="mt-2 text-center text-xs text-state-crisis">
                      {hermes.error.message || 'Ocurrió un error. Intenta de nuevo.'}
                    </p>
                  )}
                </div>
              </section>
              <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto lg:flex">
                <CouncilIndicator />
                <WidgetGrid />
              </aside>
            </main>
          </div>
        )}

        {/* Ventanas en MOSAICO sobre el cerebro (info bajo demanda). Solo en inmersivo:
            el tablero completo ya tiene su propio flujo de conversación. */}
        {immersive && <WindowsLayer />}

        {/* Overlays invocables */}
        <BriefingPanel open={briefingOpen} onClose={() => setBriefingOpen(false)} />
        <PersonalizationDrawer />
        <KnowledgeDrawer />
        <VisionPanel />
        <DashboardOverlay />
      </div>
    </MotionConfig>
  )
}
