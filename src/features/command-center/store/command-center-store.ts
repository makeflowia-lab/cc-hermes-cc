'use client'

import { create } from 'zustand'
import type { Mode, SpecialistKey, Tenant, Briefing } from '../types'

export type ControlKey = 'clap' | 'gesture' | 'face' | 'voice' | 'settings'
const DEFAULT_CONTROLS: Record<ControlKey, boolean> = { clap: true, gesture: true, face: true, voice: true, settings: true }
function loadControls(): Record<ControlKey, boolean> {
  if (typeof window === 'undefined') return DEFAULT_CONTROLS
  try {
    const raw = localStorage.getItem('hermes_controls')
    return raw ? { ...DEFAULT_CONTROLS, ...JSON.parse(raw) } : DEFAULT_CONTROLS
  } catch {
    return DEFAULT_CONTROLS
  }
}

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

  // Control por GESTOS con cámara (mano mueve ventanas). Opt-in: pide permiso de cámara.
  gestureEnabled: boolean
  setGestureEnabled: (b: boolean) => void
  toggleGesture: () => void

  // Cámara elegida (deviceId) para gestos y rostro. '' = la que el navegador elija por defecto.
  cameraId: string
  setCameraId: (id: string) => void

  // Qué iconos de control mostrar en el encabezado (el usuario decide cuáles activar/ocultar).
  controls: Record<ControlKey, boolean>
  setControl: (key: ControlKey, value: boolean) => void

  // RECONOCIMIENTO FACIAL (cámara te identifica y saluda por nombre). Opt-in.
  faceEnabled: boolean
  setFaceEnabled: (b: boolean) => void
  toggleFace: () => void
  recognizedName: string | null // nombre de la persona reconocida ahora mismo (o null)
  setRecognizedName: (n: string | null) => void

  // Standby → "se inicia con 2 aplausos". Hasta activarse, solo el cerebro en pantalla.
  awake: boolean
  setAwake: (v: boolean) => void
  // Saludo de bienvenida (se muestra como subtítulo al activar)
  greeting: string
  setGreeting: (g: string) => void

  // Nombre del operador (para saludar por nombre). Se guarda en el dispositivo (localStorage).
  operatorName: string
  setOperatorName: (n: string) => void

  // Ventanas flotantes (DOC Módulo 1: widgets flotantes / multipantalla). Tantas como se pidan.
  windows: FloatingWin[]
  addWindow: (w: FloatingWin) => void
  updateWindow: (id: string, patch: Partial<FloatingWin>) => void
  removeWindow: (id: string) => void
  clearWindows: () => void
  // Ventana AMPLIADA (zoom): una a la vez, grande y centrada sobre el resto.
  expandedId: string | null
  setExpandedId: (id: string | null) => void
}

export interface MediaItem {
  url?: string // imagen
  id?: string // id de video de YouTube
  title?: string
}

export interface FloatingWin {
  id: string
  title: string
  content: string
  loading: boolean
  web?: boolean
  sources?: boolean
  media?: { kind: 'image' | 'video'; items: MediaItem[] }
  map?: { embedUrl: string; label: string; linkUrl?: string } // mapa interactivo (OpenStreetMap)
  pos?: { x: number; y: number } // posición manual (gestos con la mano); anula el mosaico
  size?: { w: number; h: number } // tamaño manual (redimensionar con 2 manos); anula el del mosaico
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

  gestureEnabled: false,
  setGestureEnabled: (gestureEnabled) => set({ gestureEnabled }),
  toggleGesture: () => set((s) => ({ gestureEnabled: !s.gestureEnabled })),

  cameraId: typeof window !== 'undefined' ? localStorage.getItem('hermes_camera') ?? '' : '',
  setCameraId: (cameraId) => {
    if (typeof window !== 'undefined') localStorage.setItem('hermes_camera', cameraId)
    set({ cameraId })
  },

  controls: loadControls(),
  setControl: (key, value) =>
    set((s) => {
      const controls = { ...s.controls, [key]: value }
      if (typeof window !== 'undefined') localStorage.setItem('hermes_controls', JSON.stringify(controls))
      return { controls }
    }),

  faceEnabled: false,
  setFaceEnabled: (faceEnabled) => set({ faceEnabled }),
  toggleFace: () => set((s) => ({ faceEnabled: !s.faceEnabled })),
  recognizedName: null,
  setRecognizedName: (recognizedName) => set({ recognizedName }),

  awake: false,
  setAwake: (awake) => set({ awake }),
  greeting: '',
  setGreeting: (greeting) => set({ greeting }),

  operatorName: typeof window !== 'undefined' ? localStorage.getItem('hermes_operator') ?? '' : '',
  setOperatorName: (operatorName) => {
    if (typeof window !== 'undefined') localStorage.setItem('hermes_operator', operatorName)
    set({ operatorName })
  },

  windows: [],
  addWindow: (w) => set((s) => ({ windows: [...s.windows, w] })),
  updateWindow: (id, patch) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  removeWindow: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id), expandedId: s.expandedId === id ? null : s.expandedId })),
  clearWindows: () => set({ windows: [], expandedId: null }),
  expandedId: null,
  setExpandedId: (expandedId) => set({ expandedId }),
}))
