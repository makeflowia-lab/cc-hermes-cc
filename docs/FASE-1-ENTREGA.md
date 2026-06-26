# Fase 1 — Entrega (Hermes Core)

Construida en una sesión con SaaS Factory V5. Esta es la base sobre la que se montan las fases siguientes.

## Criterios de aceptación del DOC 13 (§5.3, §12) — verificados

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Recibe input (texto **y voz**) | ✅ | CommandBar + Web Speech API |
| Detecta intención | ✅ | `intent-engine.ts` (gemini-2.5-flash, salida estructurada) |
| Mantiene contexto mínimo | ✅ | historial + `conversations`/`messages` en Neon |
| Genera respuesta coherente con lógica estratégica | ✅ | Opus 4.1 + Consejo + Response Engine |
| Termina en interpretación + recomendación (nunca datos crudos) | ✅ | system prompt + pruebas reales |
| Extensible sin reescritura | ✅ | motores modulares; tabla vector y council listos para F2/F4 |
| Listo para integrar datos reales | ✅ | `knowledge_documents` + pgvector preparados (vacíos) |

## Prohibiciones de Fase 1 respetadas (DOC 13 §9)

No se implementaron (por diseño, llegan en fases posteriores): visión por computadora, cluster
multi-agente distribuido, War Room multipantalla físico, motor de personalización multi-tenant completo.
*Excepción acordada con el cliente:* se incluyó **voz por navegador** y un **white-label básico** porque
fueron pedidos explícitos y son de bajo costo/alto impacto.

## Verificación end-to-end ejecutada

- `npm run build` → ✅ compila (Next 16, 4 rutas API + UI).
- `npm run typecheck` → ✅ sin errores.
- `GET /api/health` → ✅ `db.ok=true`, `model.ok=true`.
- `POST /api/hermes` → ✅ streaming real; ruteó al jurídico+electoral para "acto anticipado de campaña";
  cerró con recomendación + acción inmediata.
- `POST /api/briefing` → ✅ informe estructurado (6 items, 5 acciones) en ~8s.
- Persistencia Neon → ✅ conversaciones, mensajes y eventos guardados.
- Capturas de la Ui cinematográfica (orbe, informe, conversación, personalización) → ✅ sin errores de consola.

## Cómo se conecta la Fase 2 (siguiente paso)

1. Cargar fuentes a `knowledge_documents` (PDF/CSV/XLSX/encuestas/noticias) + generar embeddings.
2. Activar `embedding_vec` (pgvector) y un retriever en `context-engine.ts`.
3. El Intent Engine ya marca `needsData`: ahí se inyecta el contexto RAG antes de la síntesis.
