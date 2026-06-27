import type { Mode, SpecialistKey, Tenant } from '@/core/types'

export type { Mode, SpecialistKey, Tenant }

// Estado de atención de Hermes (DOC 04 §5 / "estado de atención")
export type HermesState = 'idle' | 'listening' | 'processing' | 'responding'

export interface BriefingItem {
  kind: 'riesgo' | 'oportunidad' | 'tendencia' | 'alerta' | 'agenda' | 'tema_sensible'
  title: string
  detail: string
  severity: 'info' | 'positive' | 'warning' | 'critical'
}

export interface Briefing {
  greeting: string
  headline: string
  summary: string
  items: BriefingItem[]
  priorityActions: string[]
  whatToDoToday: string
}

// Metadata que el backend adjunta a cada respuesta (intent + consejo activado)
export interface HermesMeta {
  conversationId?: string
  intent?: string
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  specialists?: SpecialistKey[]
  model?: 'balanced' | 'powerful' | 'realtime'
  usedSources?: boolean
  usedWeb?: boolean
  councilSize?: number
}
