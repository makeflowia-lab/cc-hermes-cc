// HERMES — Copiloto Estratégico (Módulo 9, "el más importante").
// Genera el informe estratégico del día como objeto estructurado (generateObject + Opus 4.1).
// Fase 1: sin fuentes en vivo → marco estratégico cualitativo y honesto, sin cifras inventadas.

import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { getTenant, logEvent } from '@/core/memory-engine'

export const runtime = 'nodejs'
export const maxDuration = 60

export const BriefingSchema = z.object({
  greeting: z.string().describe('Saludo ejecutivo y personal, menciona el nombre del usuario si se conoce'),
  headline: z.string().describe('El titular estratégico del día en una frase potente'),
  summary: z.string().describe('Resumen ejecutivo en 2-3 frases'),
  items: z
    .array(
      z.object({
        kind: z.enum(['riesgo', 'oportunidad', 'tendencia', 'alerta', 'agenda', 'tema_sensible']),
        title: z.string(),
        detail: z.string().describe('1-2 frases, con interpretación y qué implica'),
        severity: z.enum(['info', 'positive', 'warning', 'critical']),
      }),
    )
    .max(8)
    .describe('Puntos clave del día: riesgos, oportunidades, tendencias, alertas, agenda, temas sensibles'),
  priorityActions: z.array(z.string()).max(5).describe('Acciones prioritarias concretas para hoy'),
  whatToDoToday: z.string().describe('Respuesta directa a "¿qué debo hacer hoy?"'),
})

export type Briefing = z.infer<typeof BriefingSchema>

const BriefingBody = z.object({ focus: z.string().max(280).optional() })

export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({}))
  const parsedBody = BriefingBody.safeParse(raw)
  const focus = parsedBody.success ? parsedBody.data.focus : undefined

  let assistantName = 'Hermes'
  let country = 'MX'
  let tenantId = ''
  try {
    const t = await getTenant('default')
    assistantName = t.assistantName
    country = t.country
    tenantId = t.id
  } catch {
    /* defaults */
  }

  const system = `Eres ${assistantName}, el Copiloto Estratégico de un Centro de Mando de Inteligencia Política (${country}).
Generas el informe estratégico de la mañana, como lo haría el mejor jefe de estrategia de una campaña.
DISCIPLINA:
- No muestras datos crudos: cuentas la historia estratégica y SIEMPRE cierras con recomendación.
- Estás en Fase 1 (sin fuentes en vivo conectadas todavía: encuestas/redes/noticias llegan en Fase 2).
  Por eso NO inventes cifras concretas como si fueran reales. Razona cualitativamente con marco experto,
  marca supuestos, y donde haga falta un dato real, dilo explícitamente ("dato pendiente de conectar").
- Tono: ejecutivo, preciso, directo, accionable. Como hablarle a un Presidente que actuará HOY.`

  const prompt = focus
    ? `Genera el informe estratégico del día enfocado en: "${focus}".`
    : `Genera el informe estratégico del día para un líder político. Cubre el panorama general: riesgos, oportunidades, tendencias, agenda y temas sensibles típicos de una jornada de campaña/gobierno.`

  const SHAPE = `Responde ÚNICAMENTE con un objeto JSON válido (sin texto antes/después, sin bloques de código markdown), con EXACTAMENTE esta forma:
{
  "greeting": string,
  "headline": string,
  "summary": string,
  "items": [{ "kind": "riesgo"|"oportunidad"|"tendencia"|"alerta"|"agenda"|"tema_sensible", "title": string, "detail": string, "severity": "info"|"positive"|"warning"|"critical" }],
  "priorityActions": [string],
  "whatToDoToday": string
}
Máximo 6 items. Máximo 5 priorityActions.`

  // Extrae el primer objeto JSON de un texto (tolerante a fences/prosa).
  function extractJson(text: string): unknown | null {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidate = fenced ? fenced[1] : text
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(candidate.slice(start, end + 1))
    } catch {
      return null
    }
  }

  // 1) PRIMARIO: Gemini 2.5 Flash vía generateObject (rápido + json_schema confiable).
  //    El informe se auto-revela al abrir el centro de mando, así que la velocidad importa.
  try {
    const { object } = await generateObject({
      model: openrouter(MODELS.fast),
      schema: BriefingSchema,
      system,
      prompt,
    })
    if (tenantId) {
      try {
        await logEvent(tenantId, 'briefing_generated', { focus: focus ?? null, model: 'gemini-flash', items: object.items.length })
      } catch {
        /* best-effort */
      }
    }
    return Response.json(object)
  } catch (e) {
    console.warn('[briefing] Gemini Flash falló, respaldo Opus 4.1:', String(e).slice(0, 120))
  }

  // 2) RESPALDO: Opus 4.1 (el mejor modelo) vía generateText + parseo tolerante.
  try {
    const { text } = await generateText({
      model: openrouter(MODELS.powerful),
      system: `${system}\n\n${SHAPE}`,
      prompt,
    })
    const parsed = BriefingSchema.safeParse(extractJson(text))
    if (parsed.success) {
      if (tenantId) {
        try {
          await logEvent(tenantId, 'briefing_generated', { focus: focus ?? null, model: 'opus', items: parsed.data.items.length })
        } catch {
          /* best-effort */
        }
      }
      return Response.json(parsed.data)
    }
    console.error('[briefing] Opus JSON inválido')
  } catch (e) {
    console.error('[briefing] error final:', String(e).slice(0, 160))
  }
  return Response.json({ error: 'No se pudo generar el informe' }, { status: 500 })
}
