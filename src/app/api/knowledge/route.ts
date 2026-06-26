// HERMES — Centro de Datos / RAG (DOC 06 Módulo 6, Fase 2).
// Ingesta, listado y borrado de documentos de la base de conocimiento.

import { z } from 'zod'
import { getTenant, logEvent } from '@/core/memory-engine'
import { ingestDocument, listDocuments, countKnowledge, deleteDocument } from '@/core/knowledge-engine'

export const runtime = 'nodejs'
export const maxDuration = 60

const IngestSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(200_000),
  source: z.string().max(40).optional(),
})

export async function GET() {
  try {
    const tenant = await getTenant('default')
    const [documents, count] = await Promise.all([listDocuments(tenant.id), countKnowledge(tenant.id)])
    return Response.json({ documents, count })
  } catch (e) {
    console.error('[knowledge][GET]', e)
    return Response.json({ error: 'No se pudo cargar la base de conocimiento' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let body
  try {
    body = IngestSchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Documento inválido (título y contenido requeridos)' }, { status: 400 })
  }
  try {
    const tenant = await getTenant('default')
    const { chunks } = await ingestDocument({
      tenantId: tenant.id,
      title: body.title,
      source: body.source ?? 'manual',
      content: body.content,
    })
    try {
      await logEvent(tenant.id, 'knowledge_ingested', { title: body.title, chunks, source: body.source ?? 'manual' })
    } catch {
      /* best-effort */
    }
    return Response.json({ ok: true, title: body.title, chunks })
  } catch (e) {
    console.error('[knowledge][POST]', e)
    return Response.json({ error: 'No se pudo indexar el documento' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const title = new URL(req.url).searchParams.get('title')
  if (!title) return Response.json({ error: 'Falta el parámetro title' }, { status: 400 })
  try {
    const tenant = await getTenant('default')
    await deleteDocument(tenant.id, title)
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[knowledge][DELETE]', e)
    return Response.json({ error: 'No se pudo eliminar el documento' }, { status: 500 })
  }
}
