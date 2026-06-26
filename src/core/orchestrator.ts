// HERMES CORE — AI Orchestrator (DOC 03 §5, DOC 07 §3.7)
// "No responde. Decide qué especialistas deben pensar y orquesta la síntesis final."
// Fase 1: routing lógico interno (sin cluster multi-agente todavía, DOC 13 §7).

import { MODELS } from '@/lib/ai/openrouter'
import { classifyIntent } from './intent-engine'
import { buildContextBlock, buildRagContext } from './context-engine'
import { buildSystemPrompt } from './response-engine'
import { deliberate, formatDeliberations } from './council-engine'
import type { Intent, Mode, Tenant } from './types'

export interface OrchestrationPlan {
  intent: Intent
  system: string
  model: string
  modelKey: 'balanced' | 'powerful'
  usedSources: boolean
  councilSize: number // nº de especialistas que deliberaron (0 = síntesis directa)
}

// Categorías que merecen el mejor modelo (síntesis estratégica profunda).
const DEEP_CATEGORIES = new Set<Intent['category']>([
  'analisis_estrategico',
  'simulacion',
  'crisis',
  'exploracion',
  'briefing',
])

export async function orchestrate(args: {
  userText: string
  history: string
  tenant: Tenant
  mode: Mode
}): Promise<OrchestrationPlan> {
  const { userText, history, tenant, mode } = args

  // 1) Intent Engine — qué quiere y qué especialistas activar.
  const intent = await classifyIntent(userText, history)

  // 2) Context Engine — personalización + memoria.
  const contextBlock = await buildContextBlock(tenant, mode)

  // 3) RAG — si la intención requiere datos, recupera de la base de conocimiento (Fase 2).
  const ragContext =
    intent.needsData && tenant.id ? await buildRagContext(tenant.id, userText) : ''

  // 4) Routing de modelo: el MEJOR modelo (Opus 4.1) para lo estratégico; Sonnet para lo trivial.
  const useDeep = DEEP_CATEGORIES.has(intent.category) || intent.depth === 'deep' || intent.urgency === 'critical'
  const modelKey: 'balanced' | 'powerful' = useDeep ? 'powerful' : 'balanced'

  // 5) CONSEJO MULTI-AGENTE REAL (Fase 4): en consultas profundas con ≥2 especialistas,
  //    cada uno delibera en paralelo y el Coordinador (Opus) sintetiza. Las triviales van directo.
  const shouldDeliberate = useDeep && intent.specialists.filter((s) => s !== 'director_estrategico').length >= 2
  const deliberations = shouldDeliberate
    ? await deliberate({ intent, userText, history, ragContext, tenant })
    : []
  const councilDeliberations = formatDeliberations(deliberations)

  // 6) Response Engine — system prompt con consejo (deliberado o sesionado) + fuentes.
  const system = buildSystemPrompt({ tenant, intent, contextBlock, ragContext, councilDeliberations })

  return {
    intent,
    system,
    model: MODELS[modelKey],
    modelKey,
    usedSources: ragContext.length > 0,
    councilSize: deliberations.length,
  }
}
