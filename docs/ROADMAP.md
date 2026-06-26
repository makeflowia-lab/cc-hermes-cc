# Roadmap de Implementación (DOC 12)

Orden de dependencias: **CORE → DATA → UI/VOZ → AGENTES → VISIÓN+ESCALA**. No se salta de fase.
La métrica no es "features" sino **capacidad**.

| Fase | Objetivo | Incluye | Estado |
|------|----------|---------|--------|
| **1 · Hermes Core** | El cerebro mínimo funcional | Intent/Context/Orchestrator/Response/Memory + cerebro conversacional | ✅ **Entregada** |
| **2 · Datos + RAG** | Darle conocimiento real | Ingesta + chunking + embeddings (OpenRouter 1536) + pgvector HNSW + búsqueda semántica + Centro de Datos UI | ✅ **Entregada** |
| **3 · Voz + Frontend op.** | Experiencia interactiva real | STT/TTS de baja latencia, command bar, tiempo real | 🟡 Parcial (voz por navegador ya funciona) |
| **4 · Multi-agente** | Equipo de expertos real | Cluster de agentes, forecast, agregación, síntesis | ⏳ Estructura lista (council.ts) |
| **5 · Visión + War Room** | Centro de mando completo | Cámara, presencia, multipantalla, modos, multi-tenant | ⏳ Modos y white-label base listos |

## Criterio de éxito por fase
- F1: mantiene conversación útil con lógica estratégica. ✅
- F2: responde con base en datos reales, no solo lenguaje.
- F3: el usuario opera sin teclado.
- F4: actúa como equipo completo de consultores.
- F5: opera como centro de inteligencia completo sin interacción manual.

## Riesgos críticos (y mitigación aplicada)
1. **Sobre-ingeniería temprana** → se construyó Core primero, monolito modular, sin cluster prematuro.
2. **Datos sin estructura** → esquema único definido desde ya (`db/schema.sql`).
3. **Agentes sin control** → orquestador obligatorio (`orchestrator.ts`), nunca agentes sueltos.
