# Arquitectura — Hermes Command Center

## Principio

Hermes no es una aplicación: es una **red de sistemas inteligentes coordinados**. Modular, donde cada
motor puede reemplazarse sin romper el resto. En Fase 1 todo vive en un solo proyecto Next.js
(monolito modular); las fases siguientes extraen servicios sin reescribir.

## Hermes Core (el cerebro) — implementado en `src/core/`

```
Usuario (voz/texto)
      │
      ▼
Intent Engine ───────► ¿Qué quiere? urgencia, profundidad, especialistas  (gemini-2.5-flash)
      │
      ▼
Orchestrator ────────► Routing lógico: elige modelo + arma el consejo      (DOC 13 §7: sin cluster aún)
      │
      ├── Context Engine ──► personalización del tenant + memoria estratégica (Neon)
      ├── Council        ──► selecciona especialistas relevantes
      └── Response Engine ─► system prompt (identidad + 5 principios + filosofía + Regla del Presidente)
      │
      ▼
Síntesis estratégica en streaming  (anthropic/claude-opus-4.1 — el mejor modelo)
      │
      ▼
Respuesta integrada (interpretación + recomendación) → voz + UI
```

## El Consejo Estratégico de IA (el mayor diferenciador)

13 especialistas definidos en `src/core/council.ts`: Director Estratégico (coordinador), Analista
Electoral, Estratega, Consultor Jurídico, Opinión Pública, Investigador, Analista Territorial,
Comunicólogo, Speech Writer, Redactor, Analista Financiero, Detección de Crisis, Prospectiva.

El Intent Engine selecciona los relevantes; el Response Engine los "sesiona" dentro de una sola
síntesis. **El usuario nunca ve el proceso interno**, solo la respuesta integrada. En Fase 4 cada
especialista se promueve a microservicio real (la estructura ya está lista).

## Capas del sistema

| Capa | Fase 1 | Destino (fases siguientes) |
|------|--------|----------------------------|
| Interfaz | Next.js + Framer Motion, orbe, modos, multipanel | Multipantalla / War Room físico, gestos |
| Orquestación | `orchestrator.ts` (routing lógico) | Agent Orchestrator + cluster distribuido |
| Agentes | Consejo dentro de una síntesis | Cluster multi-agente (1 servicio por especialista) |
| Datos | ✅ Neon + pgvector (HNSW) + ingesta de PDF/DOCX/XLSX/CSV/TXT (pdfjs/mammoth/xlsx) + chunking/embeddings + búsqueda semántica (RAG) | Conectores en vivo (redes/noticias/encuestas), OCR de imágenes/escaneos |
| Voz | Web Speech API (STT/TTS navegador) | STT/TTS de baja latencia dedicados, barge-in |
| Visión | — | Presencia, identificación opcional, contexto de sala |
| Memoria | short/mid/long en Neon | Memoria semántica + grafo de conocimiento |
| Personalización | white-label básico (tenant) | Multi-tenant completo, feature flags, plantillas |

## Datos (Neon Postgres)

Tablas: `tenants` (white-label), `conversations`, `messages`, `memory` (short/mid/long),
`events` (observabilidad), `knowledge_documents` (RAG, preparado/vacío con `embedding_vec vector(1536)`
vía pgvector). Esquema en `db/schema.sql`, migración idempotente en `scripts/migrate.mjs`.

## Decisiones técnicas clave

- **Falla controlada**: si la BD no responde, el chat sigue funcionando (persistencia best-effort).
- **Routing de modelo por costo**: Opus 4.1 para lo estratégico; Flash para clasificación/informe.
- **Honestidad de datos**: en Fase 1 sin fuentes en vivo, Hermes razona con marco experto y supuestos
  explícitos; **no fabrica cifras** (las fuentes reales llegan en Fase 2).
