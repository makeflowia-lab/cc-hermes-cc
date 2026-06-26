// HERMES CORE — Context Engine (DOC 03 §4)
// Mantiene el contexto activo: personalización del tenant + memoria estratégica relevante.

import { getMemories } from './memory-engine'
import { searchKnowledge } from './knowledge-engine'
import type { Mode, Tenant } from './types'

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  normal: 'Modo Normal: análisis estándar, visualización estable.',
  war_room:
    'Modo War Room: alta densidad de información, múltiples frentes activos, prioriza lo accionable.',
  crisis:
    'Modo Crisis: reduce ruido, prioriza SOLO lo crítico, recomendaciones inmediatas, tono firme y breve.',
  presentation:
    'Modo Presentación: storytelling ejecutivo, menos datos crudos, más narrativa clara.',
}

export async function buildContextBlock(tenant: Tenant, mode: Mode): Promise<string> {
  let memoryBlock = ''
  try {
    const memories = await getMemories(tenant.id, 8)
    if (memories.length > 0) {
      memoryBlock =
        '\n\nMemoria estratégica relevante (decisiones y hechos previos):\n' +
        memories
          .map((m) => `- [${m.kind}] ${m.key}: ${JSON.stringify(m.value)}`)
          .join('\n')
    }
  } catch {
    // Sin memoria disponible: degradación elegante.
  }

  const org = tenant.orgName ? ` de ${tenant.orgName}` : ''
  return `Contexto operativo:
- Asistente: ${tenant.assistantName} (operando para el equipo${org}).
- País/locale: ${tenant.country} / ${tenant.locale}.
- ${MODE_DESCRIPTIONS[mode]}${memoryBlock}`
}

/**
 * RAG: recupera los chunks más relevantes de la base de conocimiento del tenant y los formatea.
 * Devuelve '' si no hay fuentes relevantes (degradación elegante). DOC 08 §4.
 */
export async function buildRagContext(tenantId: string, query: string): Promise<string> {
  if (!tenantId) return ''
  try {
    const chunks = await searchKnowledge({ tenantId, query, k: 5 })
    if (chunks.length === 0) return ''
    return chunks
      .map(
        (c, i) =>
          `[Fuente ${i + 1}: ${c.title}${c.source ? ` · ${c.source}` : ''} · relevancia ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`,
      )
      .join('\n\n')
  } catch {
    return '' // sin RAG disponible: el cerebro sigue funcionando
  }
}
