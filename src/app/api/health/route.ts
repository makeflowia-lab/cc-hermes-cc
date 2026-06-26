// HERMES — Health check: verifica BD (Neon) y modelo (OpenRouter).

import { generateText } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { getSql } from '@/lib/db/client'

export const runtime = 'nodejs'

export async function GET() {
  const out: Record<string, unknown> = { service: 'hermes-command-center', phase: 1 }

  try {
    const sql = getSql()
    const [{ count }] = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM tenants`
    out.db = { ok: true, tenants: Number(count) }
  } catch (e) {
    console.error('[health][db]', e)
    out.db = { ok: false }
  }

  try {
    const { text } = await generateText({
      model: openrouter(MODELS.fast),
      prompt: 'Responde solo: OK',
    })
    out.model = { ok: true, sample: text.trim().slice(0, 20) }
  } catch (e) {
    console.error('[health][model]', e)
    out.model = { ok: false }
  }

  return Response.json(out)
}
