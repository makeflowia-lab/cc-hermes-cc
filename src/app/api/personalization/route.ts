// HERMES — Personalización white-label (DOC 11). Lee/actualiza el tenant por defecto.

import { z } from 'zod'
import { getTenant, updateTenant, logEvent } from '@/core/memory-engine'

export const runtime = 'nodejs'

const PatchSchema = z.object({
  assistantName: z.string().min(1).max(80).optional(),
  orgName: z.string().max(120).nullable().optional(),
  accentRgb: z
    .string()
    .regex(/^\d{1,3} \d{1,3} \d{1,3}$/, 'Formato esperado: "r g b"')
    .optional(),
  country: z.string().min(2).max(4).optional(),
  countryFlag: z.string().max(16).nullable().optional(),
  partyLogo: z.string().url().max(2048).nullable().optional().or(z.literal('')),
  locale: z.string().max(10).optional(),
  visualStyle: z.enum(['political', 'government', 'corporate', 'military', 'minimal']).optional(),
})

export async function GET() {
  try {
    const tenant = await getTenant('default')
    return Response.json(tenant)
  } catch (e) {
    console.error('[personalization][GET]', e)
    return Response.json({ error: 'No se pudo cargar la personalización' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  let patch
  try {
    patch = PatchSchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Datos de personalización inválidos' }, { status: 400 })
  }
  try {
    const tenant = await updateTenant('default', patch)
    try {
      await logEvent(tenant.id, 'personalization_updated', { fields: Object.keys(patch) })
    } catch {
      /* best-effort */
    }
    return Response.json(tenant)
  } catch (e) {
    console.error('[personalization][PUT]', e)
    return Response.json({ error: 'No se pudo actualizar la personalización' }, { status: 500 })
  }
}
