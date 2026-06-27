// HERMES CORE — Ruta principal del cerebro (streaming).
// Flujo obligatorio (DOC 13 §5.2): input → Intent Engine → routing → síntesis del consejo → stream.

import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { z } from 'zod'
import { openrouter } from '@/lib/ai/openrouter'
import { orchestrate } from '@/core/orchestrator'
import { getTenant, ensureConversation, saveMessage, logEvent } from '@/core/memory-engine'
import type { Mode } from '@/core/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const BodySchema = z.object({
  messages: z.array(z.any()).min(1),
  // El cliente envía null en el primer turno (aún no hay conversación) — aceptarlo.
  conversationId: z.string().uuid().nullable().optional(),
  mode: z.enum(['normal', 'war_room', 'crisis', 'presentation']).default('normal'),
})

function textOf(message: UIMessage): string {
  if (!message.parts) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export async function POST(req: Request) {
  let body: { messages: UIMessage[]; conversationId?: string; mode: Mode }
  try {
    const parsed = BodySchema.parse(await req.json())
    body = {
      messages: parsed.messages as UIMessage[],
      conversationId: parsed.conversationId ?? undefined,
      mode: parsed.mode,
    }
  } catch {
    return Response.json({ error: 'Petición inválida' }, { status: 400 })
  }
  const { messages, mode } = body

  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userText = lastUser ? textOf(lastUser) : ''
  const history = messages
    .slice(-7, -1)
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'Hermes'}: ${textOf(m)}`)
    .join('\n')

  // Tenant + plan de orquestación (degradación elegante si la BD falla).
  let tenant
  try {
    tenant = await getTenant('default')
  } catch {
    tenant = {
      id: '',
      slug: 'default',
      assistantName: 'Hermes',
      orgName: 'Centro de Mando',
      accentRgb: '56 189 248',
      country: 'MX',
      countryFlag: '🇲🇽',
      partyLogo: null,
      locale: 'es-MX',
      visualStyle: 'political',
    }
  }

  const plan = await orchestrate({ userText, history, tenant, mode })

  // Persistencia: conversación + mensaje del usuario (best-effort).
  let conversationId = body.conversationId ?? ''
  if (tenant.id) {
    try {
      conversationId = await ensureConversation(tenant.id, body.conversationId)
      await saveMessage({ conversationId, role: 'user', content: userText, intent: plan.intent })
      await logEvent(tenant.id, 'hermes_query', {
        intent: plan.intent.category,
        urgency: plan.intent.urgency,
        model: plan.modelKey,
        specialists: plan.intent.specialists,
      })
    } catch {
      /* sin persistencia: el chat sigue funcionando */
    }
  }

  const result = streamText({
    model: openrouter(plan.model),
    system: plan.system,
    messages: convertToModelMessages(messages),
    temperature: plan.intent.category === 'small_talk' ? 0.6 : 0.4,
    onFinish: async ({ text }) => {
      if (!conversationId || !tenant.id) return
      try {
        await saveMessage({
          conversationId,
          role: 'assistant',
          content: text,
          specialists: plan.intent.specialists,
        })
      } catch {
        /* best-effort */
      }
    },
  })

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === 'start') {
        return {
          conversationId,
          intent: plan.intent.category,
          urgency: plan.intent.urgency,
          specialists: plan.intent.specialists,
          model: plan.modelKey,
          usedSources: plan.usedSources,
          usedWeb: plan.usedWeb,
          councilSize: plan.councilSize,
        }
      }
      return undefined
    },
  })
}
