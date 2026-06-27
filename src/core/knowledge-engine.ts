// HERMES CORE — Knowledge Engine (DOC 08 §3.3.2 / §4 RAG, Fase 2)
// Ingesta de documentos → chunking → embeddings → pgvector. Búsqueda semántica (KNN coseno).
// "Hermes nunca responde sin contexto."

import { getSql } from '@/lib/db/client'
import { embedText, embedTexts, toVectorLiteral } from '@/lib/ai/embeddings'

type JsonValue = Parameters<ReturnType<typeof getSql>['json']>[0]

export interface RetrievedChunk {
  title: string
  source: string | null
  content: string
  similarity: number
}

export interface DocumentSummary {
  title: string
  source: string | null
  chunks: number
}

/** Divide texto en chunks con solapamiento, respetando límites de párrafo/oración cuando es posible. */
export function chunkText(text: string, size = 900, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (clean.length <= size) return clean ? [clean] : []
  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)
    if (end < clean.length) {
      // Busca un corte natural (párrafo, oración o espacio) hacia atrás.
      const slice = clean.slice(start, end)
      const cut = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '), slice.lastIndexOf('\n'))
      if (cut > size * 0.5) end = start + cut + 1
    }
    const piece = clean.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= clean.length) break
    start = end - overlap
    if (start < 0) start = 0
  }
  return chunks
}

// Tope de texto por documento (~1 MB ≈ ~1300 chunks) para acotar costo/tiempo de embeddings
// y evitar que un archivo enorme dispare miles de inputs. Lo excedente se marca como truncado.
const MAX_CHARS_PER_DOC = 1_000_000

/** Ingesta un documento: chunk → embed → guarda en pgvector. Devuelve número de chunks. */
export async function ingestDocument(args: {
  tenantId: string
  title: string
  source?: string
  content: string
}): Promise<{ chunks: number; truncated: boolean }> {
  const { tenantId, title, source = 'manual', content } = args
  const truncated = content.length > MAX_CHARS_PER_DOC
  const text = truncated ? content.slice(0, MAX_CHARS_PER_DOC) : content
  const chunks = chunkText(text)
  if (chunks.length === 0) return { chunks: 0, truncated }
  if (truncated) {
    console.warn(`[knowledge] "${title}" truncado a ${MAX_CHARS_PER_DOC} chars (${chunks.length} chunks)`)
  }

  const vectors = await embedTexts(chunks)
  const sql = getSql()

  // Reemplaza versiones previas del mismo documento (mismo título) para evitar duplicados.
  await sql`DELETE FROM knowledge_documents WHERE tenant_id = ${tenantId} AND title = ${title}`

  for (let i = 0; i < chunks.length; i++) {
    await sql`
      INSERT INTO knowledge_documents (tenant_id, title, source, content, embedding_vec, metadata)
      VALUES (
        ${tenantId}, ${title}, ${source}, ${chunks[i]},
        ${toVectorLiteral(vectors[i])}::vector,
        ${sql.json({ chunkIndex: i, total: chunks.length } as JsonValue)}
      )`
  }
  return { chunks: chunks.length, truncated }
}

/** Búsqueda semántica: top-K chunks por distancia coseno. */
export async function searchKnowledge(args: {
  tenantId: string
  query: string
  k?: number
  minSimilarity?: number
}): Promise<RetrievedChunk[]> {
  const { tenantId, query, k = 5, minSimilarity = 0.2 } = args
  const qv = toVectorLiteral(await embedText(query))
  const sql = getSql()
  const rows = await sql<RetrievedChunk[]>`
    SELECT title, source, content,
           1 - (embedding_vec <=> ${qv}::vector) AS similarity
    FROM knowledge_documents
    WHERE tenant_id = ${tenantId} AND embedding_vec IS NOT NULL
    ORDER BY embedding_vec <=> ${qv}::vector
    LIMIT ${k}`
  return rows.filter((r) => r.similarity >= minSimilarity)
}

export async function listDocuments(tenantId: string): Promise<DocumentSummary[]> {
  const sql = getSql()
  return sql<DocumentSummary[]>`
    SELECT title, max(source) AS source, count(*)::int AS chunks
    FROM knowledge_documents
    WHERE tenant_id = ${tenantId}
    GROUP BY title
    ORDER BY max(created_at) DESC`
}

export async function countKnowledge(tenantId: string): Promise<{ documents: number; chunks: number }> {
  const sql = getSql()
  const [row] = await sql<{ documents: number; chunks: number }[]>`
    SELECT count(DISTINCT title)::int AS documents, count(*)::int AS chunks
    FROM knowledge_documents WHERE tenant_id = ${tenantId}`
  return row ?? { documents: 0, chunks: 0 }
}

export async function deleteDocument(tenantId: string, title: string): Promise<void> {
  const sql = getSql()
  await sql`DELETE FROM knowledge_documents WHERE tenant_id = ${tenantId} AND title = ${title}`
}
