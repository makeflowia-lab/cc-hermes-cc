'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useHermes } from '../hooks/useHermes'
import { useCommandCenter } from '../store/command-center-store'
import { applyAccent } from '../theme'
import type { Tenant } from '../types'
import { AmbientBackground } from './AmbientBackground'
import { StatusBar } from './StatusBar'
import { HermesOrb } from './HermesOrb'
import { CommandBar } from './CommandBar'
import { ConversationStream } from './ConversationStream'
import { CouncilIndicator } from './CouncilIndicator'
import { WidgetGrid } from './WidgetGrid'
import { BriefingPanel } from './BriefingPanel'
import { PersonalizationDrawer } from './PersonalizationDrawer'
import { KnowledgeDrawer } from './KnowledgeDrawer'
import { VisionPanel } from './VisionPanel'

export function CommandCenter() {
  const hermes = useHermes()
  const { setPersonalization, personalization, setBriefing, setBriefingLoading, setKnowledgeCount } =
    useCommandCenter()
  const [briefingOpen, setBriefingOpenState] = useState(false)
  // Una vez que el usuario interactúa con el informe (abrir/cerrar), no se auto-revela de nuevo.
  const briefingTouched = useRef(false)
  const openBriefing = useCallback(() => {
    briefingTouched.current = true
    setBriefingOpenState(true)
  }, [])
  const closeBriefing = useCallback(() => {
    briefingTouched.current = true
    setBriefingOpenState(false)
  }, [])

  // Carga la personalización del tenant y aplica el acento.
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

  // Conteo de la base de conocimiento (RAG / Fase 2).
  useEffect(() => {
    fetch('/api/knowledge')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.count && setKnowledgeCount(d.count))
      .catch(() => {})
  }, [setKnowledgeCount])

  // Copiloto: genera el informe del día EN SEGUNDO PLANO y lo "revela" al estar listo
  // (el momento "Buenos días, tengo preparado tu informe") sin bloquear el centro de mando.
  const briefingKicked = useRef(false)
  useEffect(() => {
    if (briefingKicked.current) return
    briefingKicked.current = true
    setBriefingLoading(true)
    fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        setBriefing(data)
        // Auto-revelar solo si el usuario no empezó a conversar NI ya tocó el informe.
        if (useCommandCenter.getState().conversationId === null && !briefingTouched.current) {
          setBriefingOpenState(true)
        }
      })
      .catch(() => setBriefing(null))
      .finally(() => setBriefingLoading(false))
  }, [setBriefing, setBriefingLoading])

  const mode = useCommandCenter((s) => s.mode)
  const assistantName = personalization?.assistantName ?? 'Hermes'
  const busy = hermes.status === 'submitted' || hermes.status === 'streaming'
  const hasConversation = hermes.messages.length > 0

  // Layout por modo (DOC 04 §13): presentación oculta el rail; war room lo ensancha.
  const showRail = mode !== 'presentation'
  const gridCols =
    mode === 'presentation'
      ? 'lg:grid-cols-1'
      : mode === 'war_room'
        ? 'lg:grid-cols-[1fr_26rem]'
        : 'lg:grid-cols-[1fr_22rem]'

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative flex h-screen flex-col overflow-hidden">
      <AmbientBackground />
      {/* Modo Crisis: viñeta roja perimetral (DOC 05 §11.3) */}
      {mode === 'crisis' && (
        <div
          className="pointer-events-none fixed inset-0 z-20 animate-pulse"
          style={{ boxShadow: 'inset 0 0 160px -40px rgba(244,63,94,0.55)' }}
          aria-hidden="true"
        />
      )}
      <StatusBar />

      <main className={`grid flex-1 grid-cols-1 gap-4 overflow-hidden px-4 pb-4 ${gridCols}`}>
        {/* Columna principal: orbe + conversación + barra de comandos */}
        <section className="flex min-h-0 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center overflow-hidden">
            {!hasConversation ? (
              <motion.div
                className="flex flex-col items-center gap-6 text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <HermesOrb state={hermes.hermesState} speaking={hermes.voice.speaking} />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white text-glow sm:text-3xl">
                    {personalization?.orgName ? `${personalization.orgName}` : 'Centro de Mando'}
                  </h1>
                  <p className="mt-2 max-w-md text-sm text-slate-400">
                    Sistema Operativo de Inteligencia Estratégica. Háblale o escríbele a {assistantName}:
                    análisis, prospección y recomendaciones en tiempo real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openBriefing}
                  className="flex items-center gap-2 rounded-full glass glass-accent px-4 py-2 text-xs text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <FileText className="h-4 w-4 accent" aria-hidden="true" />
                  Ver informe estratégico del día
                </button>
              </motion.div>
            ) : (
              <div className="flex h-full w-full max-w-3xl flex-col">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="scale-50 origin-left">
                      <HermesOrb state={hermes.hermesState} speaking={hermes.voice.speaking} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openBriefing}
                    className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <FileText className="h-3.5 w-3.5 accent" aria-hidden="true" />
                    Informe del día
                  </button>
                </div>
                <ConversationStream
                  messages={hermes.messages}
                  processing={hermes.status === 'submitted'}
                  assistantName={assistantName}
                />
              </div>
            )}
          </div>

          <div className="mx-auto w-full max-w-3xl pt-2">
            <CommandBar
              onAsk={hermes.ask}
              onStartListening={hermes.startListening}
              onStopListening={hermes.stopListening}
              onStop={hermes.stop}
              listening={hermes.voice.listening}
              interim={hermes.voice.interim}
              sttSupported={hermes.voice.sttSupported}
              busy={busy}
            />
            {hermes.error && (
              <p role="alert" className="mt-2 text-center text-xs text-state-crisis">
                {hermes.error.message || 'Ocurrió un error. Intenta de nuevo.'}
              </p>
            )}
          </div>
        </section>

        {/* Rail derecho: consejo + monitores (oculto en móvil y en modo presentación) */}
        {showRail && (
          <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto lg:flex">
            <CouncilIndicator />
            <WidgetGrid />
          </aside>
        )}
      </main>

      <BriefingPanel open={briefingOpen} onClose={closeBriefing} />
      <PersonalizationDrawer />
      <KnowledgeDrawer />
      <VisionPanel />
    </div>
    </MotionConfig>
  )
}
