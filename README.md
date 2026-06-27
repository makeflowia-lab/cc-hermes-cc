# HERMES COMMAND CENTER (HCC)

> **The Operating System for Strategic Intelligence.**
> El primer Sistema Operativo de Inteligencia Estratégica multimodal. La política es el primer vertical.

Centro de mando tipo "Jarvis" enfocado en inteligencia política: el usuario **conversa** (voz o texto)
y un **Consejo Estratégico de IA** analiza, interpreta y **recomienda** en tiempo real. No es un dashboard,
no es un chatbot — es un asistente estratégico que razona como un equipo completo de consultores.

Construido con la **SaaS Factory V5** (Golden Path) en una sola sesión. Esta entrega es la **Fase 1: Hermes Core**.

---

## 🧠 Qué es (y qué NO es)

| Principio (DOC 01) | Cómo se cumple en Fase 1 |
|---|---|
| **Conversacional** | Hablas o escribes; no navegas menús. Voz nativa del navegador (escuchar + hablar). |
| **Estratégico** | Cada respuesta termina en **interpretación + recomendación**, nunca en datos crudos. |
| **Predictivo** | El Copiloto genera un **informe del día** automáticamente al entrar ("¿qué debo hacer hoy?"). |
| **Invisible** | El "Consejo Estratégico" (analista electoral, jurídico, crisis, prospectiva…) razona por dentro; tú ves una sola respuesta integrada. |
| **Visual** | Interfaz cinematográfica: orbe vivo, fondo holográfico, paneles de vidrio, modos (Normal / War Room / Crisis / Presentación). |

---

## 🏗️ Stack (Golden Path + ajustes del proyecto)

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router + Turbopack) + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 + animaciones Framer Motion + iconos lucide-react |
| 3D / visual | Three.js 0.171 (cerebro neuronal, shaders/partículas) |
| IA | Vercel AI SDK v5 + OpenRouter |
| Modelo conversacional | **`claude-opus-4.1`** (el mejor — síntesis estratégica) |
| Routing / clasificación | `gemini-2.5-flash` (Intent Engine + informe estructurado); `gemini-2.5-pro` (JSON) |
| Tiempo real | `perplexity/sonar` (web en vivo + fuentes) |
| Embeddings / RAG | `openai/text-embedding-3-small` (1536) + pgvector (HNSW) |
| Base de datos | **Neon Postgres** (memoria, conversaciones, eventos, conocimiento) |
| Estado · Validación | Zustand · Zod |
| Voz | **ElevenLabs** TTS (`eleven_multilingual_v2`) + Web Speech API (fallback STT/TTS) |
| Visión / gestos | **MediaPipe Tasks-Vision** (Hand Landmarker) + **@vladmandic/face-api** (reconocimiento) — vía CDN |
| Mapas / media | OpenStreetMap (embed) + Nominatim (geocodificación); YouTube + Bing Images (sin API key) |
| Deploy | Vercel — **https://cc-hermes-cc.vercel.app** |

> **Nota de modelos:** la conversación usa Opus 4.1 (la inteligencia con la que hablas). El informe
> estructurado usa Gemini Flash/Pro porque los modelos Anthropic no soportan salida `json_schema`
> vía OpenRouter; es rápido y confiable para esa tarea.

---

## 🚀 Cómo correrlo

```bash
npm install
npm run migrate     # crea las tablas en Neon (idempotente)
npm run dev         # http://localhost:3000
```

Variables en `.env.local` (ya configuradas): `OPENROUTER_API_KEY`, `DATABASE_URL` (Neon),
`NEXT_PUBLIC_SITE_URL`, y para la voz natural `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`
(opcional; sin ella la voz cae a la del navegador).

Verificación rápida: `GET /api/health` debe responder `db.ok` y `model.ok` en `true`.

---

## 🗺️ Mapa del producto (HERMES CORE — Fase 1)

```
src/
├── core/                      # HERMES CORE — el cerebro (DOC 02/03/13)
│   ├── intent-engine.ts       # Qué quiere el usuario → especialistas + urgencia (gemini-flash)
│   ├── orchestrator.ts        # Routing lógico: intent → modelo → consejo
│   ├── council.ts             # Consejo Estratégico de IA (13 especialistas)
│   ├── context-engine.ts      # Personalización + memoria estratégica
│   ├── response-engine.ts     # System prompt: identidad, 5 principios, filosofía, Regla del Presidente
│   └── memory-engine.ts       # Persistencia sobre Neon (tenant, conversación, memoria, eventos)
├── app/api/
│   ├── hermes/route.ts        # Cerebro en streaming (Opus 4.1)
│   ├── briefing/route.ts      # Copiloto Estratégico — informe del día (Módulo 9)
│   ├── personalization/route.ts  # White-label (DOC 11)
│   └── health/route.ts
└── features/command-center/   # Interfaz cinematográfica (Feature-First)
    ├── components/            # Orbe, barra de comandos, consejo, monitores, informe, personalización
    ├── hooks/                 # useHermes (cerebro+voz), useVoice (Web Speech)
    └── store/                 # Zustand (modo, personalización, consejo activo)
```

---

## ✅ Qué incluye (Fases 1 y 2 entregadas)

**Fase 1 — Hermes Core:**
- **Hermes Core**: Intent Engine, Context Engine, Orchestrator, Response Engine, Memory (short/mid/long).
- **Consejo Estratégico**: 13 especialistas; el orquestador activa los relevantes y sintetiza una sola voz.
- **Conversación por voz y texto** con Opus 4.1, interpretación + recomendación siempre.
- **Copiloto** (informe estratégico del día) que se revela al entrar.
- **Persistencia real** en Neon (conversaciones, mensajes, memoria, eventos).
- **White-label**: nombre del asistente, color, bandera, logo, estilo visual — sin tocar código.
- **Experiencia inmersiva (por defecto)**: en pantalla **solo está el cerebro** (Jarvis). Todo lo demás
  (informe, centro de datos, tablero/monitores, personalización) **se invoca por voz a través de Hermes**
  ("muéstrame el informe", "centro de datos", "el tablero", "oculta todo"). El tablero completo está a un clic.
- **Cerebro neuronal 3D VIVO e interactivo** (Three.js/WebGL, estilo "Z.E.R.O.") — ~3600 neuronas que pulsan en
  GPU, ondas de energía que viajan del núcleo hacia afuera, ráfagas, sinapsis y regiones etiquetadas mapeadas
  al Consejo. **Reacciona cuando le pides algo**: se encienden las regiones/especialistas que consulta
  ("buscando…") y dispara una ráfaga al encontrar. Nunca estático (reduce-motion lo calma, no lo congela).
- **Activación por 2 APLAUSOS** (Web Audio) o tap: arranca en **standby (solo el cerebro)**; al **aplaudir
  dos veces** Hermes **enciende** el cerebro (ráfaga), **saluda por voz según la hora** ("Buenos días/
  tardes/noches, ¿en qué podemos ayudarte?") y entra en **modo escucha continua**: pides una cosa tras otra
  sin volver a aplaudir; **dices "ok" y vuelve a standby**. Voz-primero: sin barra ni textos; los controles
  solo aparecen al mover el mouse.
- **Información en TIEMPO REAL**: cuando preguntas por algo actual (noticias de hoy, eventos en curso,
  últimas declaraciones), Hermes usa **Perplexity Sonar** (vía OpenRouter) para buscar en la web y responde
  con datos del momento + fuentes; badge "Tiempo real · web". (DOC Módulo 4.)

**Fase 2 — Datos + RAG (Centro de Datos):**
- **Ingesta de documentos** — pegar texto o **subir PDF / Word (.docx) / Excel (.xlsx) / CSV / TXT** (Módulo 6); el servidor extrae el texto (pdfjs / mammoth / xlsx) → chunking → **embeddings** (`text-embedding-3-small`, 1536) → **pgvector** (índice HNSW).
- **Búsqueda semántica**: cuando la consulta requiere datos, Hermes recupera los fragmentos relevantes y **razona y cita sobre datos reales** (no cifras inventadas).
- **Centro de Datos UI**: alta/listado/borrado de documentos + conteo indexado; badge "Fuentes consultadas" en las respuestas que usan RAG.

**Fase 3 — Voz operativa:** voz por navegador (STT + TTS) + **wake word "Hermes"** manos-libres (escucha continua, barge-in, se pausa durante respuesta/voz para no auto-escucharse).

**Fase 4 — Consejo multi-agente REAL:** en consultas profundas, los especialistas relevantes **deliberan en paralelo** (modelo rápido) y el **Coordinador (Opus 4.1) sintetiza** una sola respuesta; badge "Consejo: N especialistas". **Simulación de escenarios** (Módulo 8): "¿qué pasa si…?" → escenario base vs alternativo + impacto/probabilidad.

**Fase 5 — War Room + Visión:** modos **War Room / Crisis (viñeta roja) / Presentación** que reconfiguran el layout y el comportamiento del cerebro; **Visión opt-in** (cámara local + FaceDetector para presencia, apagada por defecto, con aviso de privacidad).

## 🖐️ Interacción multimodal avanzada (Jarvis real)

Capa de interacción añadida sobre Hermes Core. Todo es **opt-in** (iconos en el encabezado; configurables
en Personalización) y la cámara/voz por gestos funciona mejor en **Chrome de escritorio**.

**Voz natural (ElevenLabs).** Las respuestas y el saludo se hablan con voz neuronal (`eleven_multilingual_v2`,
voz por defecto "Brian"). Si la nube falla (p. ej. cuota gratis agotada) cae **consistentemente** a la voz del
navegador, sin brincar entre dos voces. Ruta `/api/tts`.

**Saludo por nombre + reconocimiento facial.** Pones tu nombre en Personalización; con el rostro encendido,
registras tu cara una vez (face-api.js, descriptor en el dispositivo) y Hermes te identifica por cámara y te
saluda **"Hola, [nombre]"**.

**Ventanas inteligentes (mosaico).** Hermes **decide** qué mostrar: las preguntas del sistema se contestan por
voz (sin ventana); los pedidos de internet abren ventanas en mosaico:
- **Imágenes** ("muéstrame fotos de…") · **Video** ("pon un video de…", YouTube embebido)
- **Mapas** ("¿dónde está…?", "mapa de…") — OpenStreetMap con zoom y marcador
- **Texto** ("muéstrame en una ventana…") — la respuesta del LLM
- Botón **ampliar (zoom)** en cada ventana; cerrar/limpiar por voz ("cierra las ventanas", "oculta todo").

**Control por gestos con la mano (MediaPipe).** Cursor en la punta del índice; cada gesto destructivo se "arma"
abriendo la mano antes (evita disparos accidentales):

| Gesto | Acción |
|---|---|
| 🤏 1 mano pellizco | Mover ventana |
| 🤲 2 manos pellizco (separar/juntar) | Redimensionar / maximizar |
| ☝️ 1 dedo | Cerrar ventana |
| ✌️ 2 dedos | Pausar video |
| 👍 Pulgar arriba | Reproducir / reanudar / ampliar |
| 👋 Mano abierta deslizando | Siguiente / anterior video |

**Cámara elegible** (integrada vs USB) e **iconos de control configurables** (aplausos, gestos, rostro, voz,
configuración) desde Personalización.

> Nota: Safari de iPhone no soporta el dictado por voz (Web Speech) ni todos los gestos; usa Chrome de
> computadora para la experiencia completa.

## ⏭️ Escalamientos de producción (no fases nuevas)

Las 5 fases del roadmap están entregadas. Lo que sigue es robustecer: STT/TTS dedicados de baja latencia,
cluster de agentes como microservicios, multipantalla física / multi-tenant completo, conectores de datos
en vivo (redes/noticias/encuestas) y OCR/PDF/DOCX para el Centro de Datos.

Ver [`docs/`](./docs) para el blueprint completo (visión, arquitectura, roadmap).

---

*Construido con SaaS Factory V5. "El usuario habla, tú construyes Y operas."*
