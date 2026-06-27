// HERMES CORE — Tipos compartidos (DOC 02, 03, 13)

export type Mode = 'normal' | 'war_room' | 'crisis' | 'presentation'

export type IntentCategory =
  | 'small_talk' // saludo, charla breve
  | 'consulta_simple' // resumen ejecutivo rápido
  | 'analisis_estrategico' // análisis profundo
  | 'simulacion' // "¿qué pasa si…?"
  | 'crisis' // riesgo inmediato
  | 'exploracion' // investigación abierta
  | 'accion_operativa' // comando ("activa modo war room", "mueve…")
  | 'briefing' // informe del día / "¿qué debo hacer hoy?"

export type Urgency = 'low' | 'medium' | 'high' | 'critical'
export type Depth = 'shallow' | 'deep'

export type SpecialistKey =
  | 'director_estrategico'
  | 'analista_electoral'
  | 'estratega'
  | 'juridico'
  | 'opinion_publica'
  | 'investigador'
  | 'territorial'
  | 'comunicologo'
  | 'speech_writer'
  | 'redactor'
  | 'financiero'
  | 'crisis'
  | 'prospectiva'

export interface Intent {
  category: IntentCategory
  urgency: Urgency
  depth: Depth
  topics: string[]
  specialists: SpecialistKey[]
  needsData: boolean
  needsWeb: boolean
  summary: string
}

export interface Tenant {
  id: string
  slug: string
  assistantName: string
  orgName: string | null
  accentRgb: string // "r g b"
  country: string
  countryFlag: string | null
  partyLogo: string | null
  backgroundImage: string | null // foto/logo de fondo (URL, ruta /public o data URI); el cerebro va delante
  locale: string
  visualStyle: string
}

export interface MemoryRecord {
  scope: 'short' | 'mid' | 'long'
  kind: string
  key: string
  value: unknown
  importance: number
}
