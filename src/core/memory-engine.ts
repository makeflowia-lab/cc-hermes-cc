// HERMES CORE — Memory Engine (DOC 03 §11, DOC 07 §3.10)
// Persistencia inteligente sobre Neon: tenant, conversación, mensajes, memoria, eventos.
// Las rutas envuelven estas llamadas en try/catch para degradación elegante (falla controlada).

import { getSql } from '@/lib/db/client'
import type { MemoryRecord, Tenant } from './types'

// Tipo exacto que espera sql.json() en porsager/postgres (JSONValue).
type JsonValue = Parameters<ReturnType<typeof getSql>['json']>[0]

interface TenantRow {
  id: string
  slug: string
  assistant_name: string
  org_name: string | null
  accent_rgb: string
  country: string
  country_flag: string | null
  party_logo: string | null
  background_image: string | null
  brain_variant: string
  locale: string
  visual_style: string
}

function mapTenant(r: TenantRow): Tenant {
  return {
    id: r.id,
    slug: r.slug,
    assistantName: r.assistant_name,
    orgName: r.org_name,
    accentRgb: r.accent_rgb,
    country: r.country,
    countryFlag: r.country_flag,
    partyLogo: r.party_logo,
    backgroundImage: r.background_image,
    brainVariant: r.brain_variant,
    locale: r.locale,
    visualStyle: r.visual_style,
  }
}

export async function getTenant(slug = 'default'): Promise<Tenant> {
  const sql = getSql()
  const rows = await sql<TenantRow[]>`SELECT * FROM tenants WHERE slug = ${slug} LIMIT 1`
  if (rows.length === 0) {
    const created = await sql<TenantRow[]>`
      INSERT INTO tenants (slug) VALUES (${slug}) RETURNING *`
    return mapTenant(created[0])
  }
  return mapTenant(rows[0])
}

export interface TenantPatch {
  assistantName?: string
  orgName?: string | null
  accentRgb?: string
  country?: string
  countryFlag?: string | null
  partyLogo?: string | null
  backgroundImage?: string | null
  brainVariant?: string
  locale?: string
  visualStyle?: string
}

export async function updateTenant(slug: string, patch: TenantPatch): Promise<Tenant> {
  const sql = getSql()
  const rows = await sql<TenantRow[]>`
    UPDATE tenants SET
      assistant_name = COALESCE(${patch.assistantName ?? null}, assistant_name),
      org_name       = COALESCE(${patch.orgName ?? null}, org_name),
      accent_rgb     = COALESCE(${patch.accentRgb ?? null}, accent_rgb),
      country        = COALESCE(${patch.country ?? null}, country),
      country_flag   = COALESCE(${patch.countryFlag ?? null}, country_flag),
      party_logo     = COALESCE(${patch.partyLogo ?? null}, party_logo),
      background_image = ${
        patch.backgroundImage === undefined ? sql`background_image` : patch.backgroundImage || null
      },
      brain_variant  = COALESCE(${patch.brainVariant ?? null}, brain_variant),
      locale         = COALESCE(${patch.locale ?? null}, locale),
      visual_style   = COALESCE(${patch.visualStyle ?? null}, visual_style),
      updated_at     = now()
    WHERE slug = ${slug}
    RETURNING *`
  return mapTenant(rows[0])
}

export async function ensureConversation(tenantId: string, conversationId?: string): Promise<string> {
  const sql = getSql()
  if (conversationId) {
    const rows = await sql<{ id: string }[]>`SELECT id FROM conversations WHERE id = ${conversationId} LIMIT 1`
    if (rows.length > 0) return rows[0].id
  }
  const created = await sql<{ id: string }[]>`
    INSERT INTO conversations (tenant_id) VALUES (${tenantId}) RETURNING id`
  return created[0].id
}

export async function saveMessage(args: {
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  intent?: unknown
  specialists?: string[]
}): Promise<void> {
  const sql = getSql()
  await sql`
    INSERT INTO messages (conversation_id, role, content, intent, specialists)
    VALUES (
      ${args.conversationId},
      ${args.role},
      ${args.content},
      ${args.intent ? sql.json(args.intent as JsonValue) : null},
      ${args.specialists ?? []}
    )`
  await sql`UPDATE conversations SET updated_at = now() WHERE id = ${args.conversationId}`
}

export async function getMemories(tenantId: string, limit = 8): Promise<MemoryRecord[]> {
  const sql = getSql()
  const rows = await sql<
    { scope: MemoryRecord['scope']; kind: string; key: string; value: unknown; importance: number }[]
  >`
    SELECT scope, kind, key, value, importance FROM memory
    WHERE tenant_id = ${tenantId} AND (expires_at IS NULL OR expires_at > now())
    ORDER BY importance DESC, created_at DESC
    LIMIT ${limit}`
  return rows
}

export async function saveMemory(tenantId: string, rec: MemoryRecord): Promise<void> {
  const sql = getSql()
  await sql`
    INSERT INTO memory (tenant_id, scope, kind, key, value, importance)
    VALUES (${tenantId}, ${rec.scope}, ${rec.kind}, ${rec.key}, ${sql.json(rec.value as JsonValue)}, ${rec.importance})`
}

export async function logEvent(tenantId: string | null, name: string, props: object = {}): Promise<void> {
  const sql = getSql()
  await sql`INSERT INTO events (tenant_id, name, props) VALUES (${tenantId}, ${name}, ${sql.json(props as JsonValue)})`
}
