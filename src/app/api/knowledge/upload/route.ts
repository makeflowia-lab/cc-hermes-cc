// HERMES — Subida de documentos al Centro de Datos (Módulo 6).
// Acepta multipart (PDF/DOCX/XLSX/CSV/TXT), extrae texto e ingiere al RAG.

import { getTenant, logEvent } from '@/core/memory-engine'
import { ingestDocument } from '@/core/knowledge-engine'
import { parseDocument, isSupported } from '@/core/document-parser'

export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: 'Subida inválida' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) return Response.json({ error: 'Falta el archivo' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'Archivo demasiado grande (máx 15 MB)' }, { status: 413 })
  if (!isSupported(file.name))
    return Response.json({ error: 'Formato no soportado (PDF, Word, Excel, CSV o TXT)' }, { status: 415 })

  const titleRaw = form.get('title')
  const title =
    (typeof titleRaw === 'string' && titleRaw.trim()) || file.name.replace(/\.[^.]+$/, '')

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { text, kind } = await parseDocument(file.name, buffer)
    if (!text || text.trim().length < 10) {
      return Response.json({ error: 'No se pudo extraer texto del documento' }, { status: 422 })
    }
    const tenant = await getTenant('default')
    const { chunks, truncated } = await ingestDocument({ tenantId: tenant.id, title, source: kind, content: text })
    try {
      await logEvent(tenant.id, 'knowledge_uploaded', { title, kind, chunks, truncated, bytes: file.size })
    } catch {
      /* best-effort */
    }
    return Response.json({ ok: true, title, kind, chunks, truncated, chars: text.length })
  } catch (e) {
    console.error('[knowledge/upload]', e)
    return Response.json({ error: 'No se pudo procesar el documento' }, { status: 500 })
  }
}
