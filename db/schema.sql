-- ============================================================
-- HERMES COMMAND CENTER — Esquema de datos (Fase 1)
-- DOC 08 (Sistema de Datos) + DOC 13 §6 (Data Foundation)
-- "Los datos no son almacenamiento. Son combustible de decisión."
-- Idempotente: se puede re-ejecutar sin romper nada.
-- ============================================================

-- ---------- TENANT / PERSONALIZACIÓN (white-label, DOC 11) ----------
CREATE TABLE IF NOT EXISTS tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  assistant_name text NOT NULL DEFAULT 'Hermes',
  org_name      text,
  accent_rgb    text NOT NULL DEFAULT '56 189 248',   -- "r g b" para CSS var --hermes-accent
  country       text NOT NULL DEFAULT 'MX',
  country_flag  text,                                  -- emoji o URL de bandera
  party_logo    text,                                  -- URL del logo de partido/organización
  locale        text NOT NULL DEFAULT 'es-MX',
  visual_style  text NOT NULL DEFAULT 'political',     -- political | government | corporate | military | minimal
  background_image text,                               -- foto/logo de fondo (URL, ruta /public o data URI)
  brain_variant text NOT NULL DEFAULT 'aurora',        -- aurora | jarvis | plasma | matrix | gold
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- Migraciones idempotentes para instalaciones existentes.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS background_image text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brain_variant text NOT NULL DEFAULT 'aurora';

-- ---------- CONVERSACIONES (memoria de medio plazo) ----------
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Sesión estratégica',
  mode        text NOT NULL DEFAULT 'normal',          -- normal | war_room | crisis | presentation
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id, updated_at DESC);

-- ---------- MENSAJES (memoria de corto plazo / conversación activa) ----------
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL,                        -- user | assistant | system
  content         text NOT NULL DEFAULT '',
  intent          jsonb,                                -- salida del Intent Engine
  specialists     text[] DEFAULT '{}',                  -- consejo estratégico activado
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- ---------- MEMORIA ESTRATÉGICA (corto / medio / largo plazo, DOC 03 §11) ----------
CREATE TABLE IF NOT EXISTS memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  scope       text NOT NULL DEFAULT 'long',             -- short | mid | long
  kind        text NOT NULL DEFAULT 'fact',             -- fact | decision | preference | strategy
  key         text NOT NULL,
  value       jsonb NOT NULL,
  importance  int  NOT NULL DEFAULT 1,                  -- 1..5 (DOC 08 §11 jerarquía)
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_memory_tenant_scope ON memory(tenant_id, scope, importance DESC);

-- ---------- EVENTOS (observabilidad / analytics — convención de la fábrica) ----------
CREATE TABLE IF NOT EXISTS events (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid REFERENCES tenants(id) ON DELETE SET NULL,
  name        text NOT NULL,
  props       jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name, created_at DESC);

-- ---------- KNOWLEDGE / RAG (preparado, vacío — Fase 2, DOC 08 §3.3.2) ----------
-- En Fase 1 el embedding se guarda como jsonb. migrate.mjs intenta habilitar
-- pgvector (best-effort) y migrar a una columna vector(1536) real cuando exista.
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  title       text NOT NULL,
  source      text,                                     -- pdf | docx | xlsx | api | rss | manual
  content     text NOT NULL DEFAULT '',
  embedding   jsonb,                                    -- placeholder Fase 1 (Fase 2 → vector)
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- SEED: tenant por defecto ----------
INSERT INTO tenants (slug, assistant_name, org_name, accent_rgb, country, country_flag, locale, visual_style)
VALUES ('default', 'Hermes', 'Centro de Mando', '56 189 248', 'MX', '🇲🇽', 'es-MX', 'political')
ON CONFLICT (slug) DO NOTHING;
