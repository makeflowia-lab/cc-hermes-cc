# Roadmap de Implementación (DOC 12)

Orden de dependencias: **CORE → DATA → UI/VOZ → AGENTES → VISIÓN+ESCALA**. No se salta de fase.
La métrica no es "features" sino **capacidad**.

| Fase | Objetivo | Incluye | Estado |
|------|----------|---------|--------|
| **1 · Hermes Core** | El cerebro mínimo funcional | Intent/Context/Orchestrator/Response/Memory + cerebro conversacional | ✅ **Entregada** |
| **2 · Datos + RAG** | Darle conocimiento real | Ingesta + chunking + embeddings (OpenRouter 1536) + pgvector HNSW + búsqueda semántica + Centro de Datos UI | ✅ **Entregada** |
| **3 · Voz + Frontend op.** | Experiencia interactiva real | Voz (STT+TTS navegador), wake word "Hermes" manos-libres + barge-in, command bar, tiempo real | ✅ **Entregada** (STT/TTS dedicado de baja latencia = mejora futura) |
| **4 · Multi-agente** | Equipo de expertos real | Consejo multi-agente REAL (especialistas en paralelo → síntesis del Coordinador), simulación de escenarios (Módulo 8) | ✅ **Entregada** |
| **5 · Visión + War Room** | Centro de mando completo | Modos War Room/Crisis/Presentación, Visión opt-in (cámara + FaceDetector, privacidad), white-label | ✅ **Entregada** (multipantalla física + multi-tenant completo = futuro) |

## Criterio de éxito por fase
- F1: mantiene conversación útil con lógica estratégica. ✅
- F2: responde con base en datos reales, no solo lenguaje. ✅
- F3: el usuario opera sin teclado (voz + wake word). ✅
- F4: actúa como equipo completo de consultores (deliberación real verificada, councilSize≥2). ✅
- F5: opera como centro de mando con modos y visión opt-in. ✅

> **Las 5 fases del roadmap están entregadas.** El Centro de Datos ya ingiere PDF/Word/Excel/CSV/TXT
> (Módulo 6). Lo que queda son escalamientos de producción (STT/TTS dedicados, cluster de agentes como
> microservicios, multipantalla física, multi-tenant, conectores de datos en vivo, OCR de imágenes/escaneos)
> — no fases nuevas, sino robustecer lo existente.

## Riesgos críticos (y mitigación aplicada)
1. **Sobre-ingeniería temprana** → se construyó Core primero, monolito modular, sin cluster prematuro.
2. **Datos sin estructura** → esquema único definido desde ya (`db/schema.sql`).
3. **Agentes sin control** → orquestador obligatorio (`orchestrator.ts`), nunca agentes sueltos.
