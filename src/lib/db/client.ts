// Cliente Postgres (Neon) para Hermes. Runtime Node (no edge).
// Cacheado en globalThis para sobrevivir el hot-reload de Next dev.

import postgres from 'postgres'

type Sql = ReturnType<typeof postgres>

const g = globalThis as unknown as { __hermesSql?: Sql }

export function getSql(): Sql {
  if (!g.__hermesSql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no configurada en .env.local')
    g.__hermesSql = postgres(url, {
      ssl: 'require',
      max: 5,
      idle_timeout: 20,
      connect_timeout: 30,
      onnotice: () => {},
    })
  }
  return g.__hermesSql
}
