// HERMES CORE — Council Engine (Fase 4, DOC 03 §6-8: Agent cluster → Aggregation → Synthesis)
// "El mayor diferenciador": Hermes no tiene un cerebro, tiene un CONSEJO.
// Cada especialista delibera en paralelo (modelo rápido); el Coordinador (Opus) sintetiza UNA respuesta.

import { generateText } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { COUNCIL } from './council'
import type { Intent, SpecialistKey, Tenant } from './types'

export interface Deliberation {
  key: SpecialistKey
  name: string
  analysis: string
}

const MAX_DELIBERATORS = 4 // acota latencia y costo

/** Corre los especialistas seleccionados en paralelo. Devuelve sus análisis independientes. */
export async function deliberate(args: {
  intent: Intent
  userText: string
  history: string
  ragContext: string
  tenant: Tenant
}): Promise<Deliberation[]> {
  const { intent, userText, history, ragContext, tenant } = args

  // El Director Estratégico es el coordinador (sintetiza), no delibera como par.
  // De-duplica: el clasificador puede repetir un especialista; no debe deliberar dos veces.
  const specialists = Array.from(new Set(intent.specialists.filter((k) => k !== 'director_estrategico'))).slice(
    0,
    MAX_DELIBERATORS,
  )
  if (specialists.length === 0) return []

  const sourcesBlock = ragContext ? `\n\nFUENTES DISPONIBLES:\n${ragContext}` : ''

  const tasks = specialists.map(async (key): Promise<Deliberation | null> => {
    const s = COUNCIL[key]
    try {
      const { text } = await generateText({
        model: openrouter(MODELS.fast),
        system: `Eres ${s.name} (${s.role}) en el consejo estratégico de ${tenant.assistantName}, sistema de inteligencia política.
${s.lens}
Entrega TU análisis especializado en 2-4 frases: el insight clave desde tu disciplina + su implicación estratégica.
Sé conciso, específico y honesto. No saludes ni te presentes. Si el tema no es de tu área, dilo en una sola frase.
Si hay FUENTES, fundaméntate en ellas y no inventes cifras.`,
        prompt: `Conversación reciente:\n${history || '(inicio)'}\n\nPregunta del líder: "${userText}"${sourcesBlock}`,
      })
      const analysis = text.trim()
      return analysis ? { key, name: s.name, analysis } : null
    } catch {
      return null // un especialista caído no rompe el consejo
    }
  })

  const results = await Promise.all(tasks)
  return results.filter((r): r is Deliberation => r !== null)
}

/** Formatea las deliberaciones para inyectarlas en el prompt de síntesis del Coordinador. */
export function formatDeliberations(delibs: Deliberation[]): string {
  if (delibs.length === 0) return ''
  return delibs.map((d) => `- **${d.name}**: ${d.analysis}`).join('\n')
}
