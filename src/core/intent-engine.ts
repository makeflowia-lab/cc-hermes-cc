// HERMES CORE — Intent Engine (DOC 03 §3, DOC 13 §5.1)
// Interpreta QUÉ quiere el usuario, su urgencia/profundidad y qué especialistas activar.
// Usa un modelo rápido/barato (no malgastar Opus en routing). Degradación elegante si falla.

import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { ALL_SPECIALISTS } from './council'
import type { Intent, SpecialistKey } from './types'

const IntentSchema = z.object({
  category: z
    .enum([
      'small_talk',
      'consulta_simple',
      'analisis_estrategico',
      'simulacion',
      'crisis',
      'exploracion',
      'accion_operativa',
      'briefing',
    ])
    .describe('Tipo de intención del usuario'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).describe('Urgencia del asunto'),
  depth: z.enum(['shallow', 'deep']).describe('Profundidad de análisis requerida'),
  topics: z.array(z.string()).max(6).describe('Temas clave detectados (ej: seguridad, encuestas, distrito 5)'),
  specialists: z
    .array(
      z.enum([
        'director_estrategico',
        'analista_electoral',
        'estratega',
        'juridico',
        'opinion_publica',
        'investigador',
        'territorial',
        'comunicologo',
        'speech_writer',
        'redactor',
        'financiero',
        'crisis',
        'prospectiva',
      ]),
    )
    .describe('Especialistas del Consejo Estratégico que deben contribuir a esta respuesta'),
  needsData: z.boolean().describe('¿Requiere datos externos/RAG para responder bien?'),
  summary: z.string().describe('Resumen en una frase de lo que el usuario realmente necesita'),
})

const CLASSIFIER_PROMPT = `Eres el Intent Engine de Hermes, un sistema de inteligencia política estratégica.
Clasifica el último mensaje del usuario considerando el contexto de la conversación.
Selecciona SOLO los especialistas realmente necesarios (entre 1 y 5).
Reglas de routing:
- saludo/charla → small_talk, specialists: [director_estrategico]
- "¿cómo vamos / cómo estamos hoy?" → consulta_simple o briefing
- "¿qué debo hacer hoy? / informe / resumen del día" → briefing
- "¿qué pasa si…?" → simulacion (incluye prospectiva, estratega)
- ataque/rumor/anomalía/urgente → crisis (incluye crisis, opinion_publica, comunicologo), urgency alta
- "activa modo war room / mueve X al monitor Y" → accion_operativa
- comparar contrincante / antecedentes → exploracion (incluye investigador)
Responde solo con el objeto estructurado.`

/** Heurística de respaldo si el modelo de clasificación falla. */
function fallbackIntent(text: string): Intent {
  const t = text.toLowerCase()
  const isCrisis = /(crisis|ataque|ataquen|rumor|urgente|escándalo|escandalo|filtraci)/.test(t)
  const isBriefing = /(qué debo hacer|que debo hacer|informe|resumen del día|resumen del dia|cómo amanec|como amanec|buenos días|buenos dias)/.test(t)
  const isSim = /(qué pasa si|que pasa si|simula|escenario)/.test(t)
  const category: Intent['category'] = isCrisis
    ? 'crisis'
    : isBriefing
      ? 'briefing'
      : isSim
        ? 'simulacion'
        : t.length < 24
          ? 'small_talk'
          : 'analisis_estrategico'
  const specialists: SpecialistKey[] = isCrisis
    ? ['director_estrategico', 'crisis', 'opinion_publica', 'comunicologo']
    : isSim
      ? ['director_estrategico', 'prospectiva', 'estratega', 'analista_electoral']
      : ['director_estrategico', 'analista_electoral', 'estratega']
  return {
    category,
    urgency: isCrisis ? 'critical' : 'medium',
    depth: category === 'small_talk' ? 'shallow' : 'deep',
    topics: [],
    specialists,
    needsData: false,
    summary: text.slice(0, 140),
  }
}

export async function classifyIntent(userText: string, history: string): Promise<Intent> {
  try {
    const { object } = await generateObject({
      model: openrouter(MODELS.fast),
      schema: IntentSchema,
      system: CLASSIFIER_PROMPT,
      prompt: `Conversación reciente:\n${history || '(inicio de conversación)'}\n\nÚltimo mensaje del usuario:\n"${userText}"`,
    })
    const raw = (object.specialists.length ? object.specialists : ['director_estrategico']) as SpecialistKey[]
    // De-duplica y valida (el clasificador puede repetir claves).
    const specialists = Array.from(new Set(raw.filter((s) => ALL_SPECIALISTS.includes(s))))
    return { ...object, specialists }
  } catch (e) {
    console.error('[intent-engine] fallback:', String(e).slice(0, 120))
    return fallbackIntent(userText)
  }
}
