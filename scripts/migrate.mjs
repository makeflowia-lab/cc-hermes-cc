/**
 * HERMES COMMAND CENTER — Migrador de base de datos (Neon Postgres)
 * Uso: npm run migrate
 * - Aplica db/schema.sql (idempotente).
 * - Best-effort: habilita pgvector y migra knowledge_documents.embedding a vector(1536).
 */
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Carga mínima de .env.local (sin dependencia de dotenv)
function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* sin .env.local: usar variables del entorno */
  }
}
loadEnv()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('✗ Falta DATABASE_URL en .env.local')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1, onnotice: () => {} })

async function main() {
  console.log('→ Conectando a Neon…')
  const schema = readFileSync(join(root, 'db', 'schema.sql'), 'utf8')

  console.log('→ Aplicando esquema base…')
  await sql.unsafe(schema)
  console.log('✓ Esquema base aplicado')

  // Best-effort: pgvector (Fase 2 RAG). Si no está disponible, seguimos sin romper.
  try {
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS vector')
    const [{ exists }] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'knowledge_documents' AND column_name = 'embedding_vec'
      ) AS exists`
    if (!exists) {
      await sql.unsafe('ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS embedding_vec vector(1536)')
    }
    // Índice HNSW para búsqueda semántica rápida (Fase 2 RAG).
    await sql.unsafe(
      'CREATE INDEX IF NOT EXISTS idx_knowledge_vec ON knowledge_documents USING hnsw (embedding_vec vector_cosine_ops)',
    )
    console.log('✓ pgvector habilitado + índice HNSW (RAG Fase 2 listo)')
  } catch (e) {
    console.log('• pgvector no disponible aún — embedding queda como jsonb (Fase 2 lo migrará).', String(e).slice(0, 80))
  }

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`
  console.log('✓ Tablas:', tables.map((t) => t.table_name).join(', '))

  await sql.end()
  console.log('✓ Migración completa')
}

main().catch(async (e) => {
  console.error('✗ Error de migración:', e)
  try {
    await sql.end()
  } catch {}
  process.exit(1)
})
