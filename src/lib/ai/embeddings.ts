// Embeddings vía OpenRouter (AI SDK v5). Motor semántico del RAG (Fase 2).
// text-embedding-3-small → 1536 dims, que coincide con knowledge_documents.embedding_vec vector(1536).

import { embed, embedMany } from 'ai'
import { openrouter } from './openrouter'

export const EMBEDDING_MODEL = 'openai/text-embedding-3-small'
export const EMBEDDING_DIM = 1536

const model = openrouter.textEmbeddingModel(EMBEDDING_MODEL)

export async function embedText(value: string): Promise<number[]> {
  const { embedding } = await embed({ model, value })
  return embedding
}

export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return []
  const { embeddings } = await embedMany({ model, values })
  return embeddings
}

/** Formato literal de pgvector: "[0.1,0.2,...]". Se castea con ::vector en la query. */
export function toVectorLiteral(vec: number[]): string {
  return '[' + vec.join(',') + ']'
}
