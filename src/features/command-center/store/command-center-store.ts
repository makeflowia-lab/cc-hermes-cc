'use client'

import { create } from 'zustand'
import type { Mode, SpecialistKey, Tenant, Briefing } from '../types'

interface CommandCenterState {
  // Modo operativo del centro de mando
  mode: Mode
  setMode: (m: Mode) => void

  // Personalización (white-label)
  personalization: Tenant | null
  setPersonalization: (t: Tenant) => void
  personalizationOpen: boolean
  setPersonalizationOpen: (open: boolean) => void

  // Conversación
  conversationId: string | null
  setConversationId: (id: string | null) => void

  // Consejo Estratégico activado en la última respuesta
  activeSpecialists: SpecialistKey[]
  lastIntent: string | null
  lastUrgency: string | null
  lastModel: string | null
  setCouncil: (data: {
    intent?: string
    urgency?: string
    specialists?: SpecialistKey[]
    model?: string
  }) => void

  // Voz
  voiceOutput: boolean // TTS — Hermes habla
  toggleVoiceOutput: () => void
  listening: boolean // micrófono activo
  setListening: (v: boolean) => void
  lastTranscript: string
  setLastTranscript: (t: string) => void
  wakeWordEnabled: boolean // escucha manos-libres por palabra de activación
  toggleWakeWord: () => void

  // Briefing (Copiloto)
  briefing: Briefing | null
  briefingLoading: boolean
  setBriefing: (b: Briefing | null) => void
  setBriefingLoading: (v: boolean) => void

  // Centro de Datos (RAG / Fase 2)
  knowledgeOpen: boolean
  setKnowledgeOpen: (open: boolean) => void
  knowledgeCount: { documents: number; chunks: number }
  setKnowledgeCount: (c: { documents: number; chunks: number }) => void

  // Visión (Fase 5, opt-in, off por defecto — privacidad)
  visionEnabled: boolean
  toggleVision: () => void

  // Inmersivo: por defecto SOLO el cerebro en pantalla; las secciones se invocan por voz.
  immersive: boolean
  setImmersive: (v: boolean) => void
  dashboardOpen: boolean // overlay con consejo + monitores (invocable)
  setDashboardOpen: (v: boolean) => void
  briefingOpen: boolean
  setBriefingOpen: (v: boolean) => void

  // Activación por doble aplauso
  clapEnabled: boolean
  toggleClap: () => void

  // Standby → "se inicia con 2 aplausos". Hasta activarse, solo el cerebro en pantalla.
  awake: boolean
  setAwake: (v: boolean) => void
  // Saludo de bienvenida (se muestra como subtítulo al activar)
  greeting: string
  setGreeting: (g: string) => void
}

export const useCommandCenter = create<CommandCenterState>((set) => ({
  mode: 'normal',
  setMode: (mode) => set({ mode }),

  personalization: null,
  setPersonalization: (personalization) => set({ personalization }),
  personalizationOpen: false,
  setPersonalizationOpen: (personalizationOpen) => set({ personalizationOpen }),

  conversationId: null,
  setConversationId: (conversationId) => set({ conversationId }),

  activeSpecialists: [],
  lastIntent: null,
  lastUrgency: null,
  lastModel: null,
  setCouncil: ({ intent, urgency, specialists, model }) =>
    set({
      lastIntent: intent ?? null,
      lastUrgency: urgency ?? null,
      activeSpecialists: specialists ?? [],
      lastModel: model ?? null,
    }),

  voiceOutput: true,
  toggleVoiceOutput: () => set((s) => ({ voiceOutput: !s.voiceOutput })),
  listening: false,
  setListening: (listening) => set({ listening }),
  lastTranscript: '',
  setLastTranscript: (lastTranscript) => set({ lastTranscript }),
  wakeWordEnabled: false,
  toggleWakeWord: () => set((s) => ({ wakeWordEnabled: !s.wakeWordEnabled })),

  briefing: null,
  briefingLoading: false,
  setBriefing: (briefing) => set({ briefing }),
  setBriefingLoading: (briefingLoading) => set({ briefingLoading }),

  knowledgeOpen: false,
  setKnowledgeOpen: (knowledgeOpen) => set({ knowledgeOpen }),
  knowledgeCount: { documents: 0, chunks: 0 },
  setKnowledgeCount: (knowledgeCount) => set({ knowledgeCount }),

  visionEnabled: false,
  toggleVision: () => set((s) => ({ visionEnabled: !s.visionEnabled })),

  immersive: true,
  setImmersive: (immersive) => set({ immersive }),
  dashboardOpen: false,
  setDashboardOpen: (dashboardOpen) => set({ dashboardOpen }),
  briefingOpen: false,
  setBriefingOpen: (briefingOpen) => set({ briefingOpen }),

  clapEnabled: true,
  toggleClap: () => set((s) => ({ clapEnabled: !s.clapEnabled })),

  awake: false,
  setAwake: (awake) => set({ awake }),
  greeting: '',
  setGreeting: (greeting) => set({ greeting }),
}))
