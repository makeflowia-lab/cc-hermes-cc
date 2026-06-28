# HERMES COMMAND CENTER — Brief de construcción (contexto para otro modelo)

> Documento autocontenido para que **otra IA o desarrollador** reconstruya Hermes Command Center,
> incluyendo **el control por gestos con la mano**. Copia/pega esto como contexto + instrucciones.
> Repo de referencia: `makeflowia-lab/cc-hermes-cc` · Producción: https://cc-hermes-cc.vercel.app

---

## 1. Qué es

Centro de mando tipo **Jarvis** para inteligencia estratégica (vertical: política). El usuario **habla o
escribe** y un **Consejo Estratégico de IA** interpreta y **recomienda** (nunca devuelve datos crudos).
La pantalla por defecto es **solo un cerebro neuronal vivo**; todo lo demás se invoca por **voz, aplauso o
gestos**. Es voz-primero e inmersivo.

## 2. Principios de comportamiento (system prompt de Hermes)

- **Invisible**: nunca menciona "tecnología", fases, modelos, límites ni su estado interno (regla `NO_META`).
- **Conversacional, ejecutivo, es-MX natural** (la respuesta puede leerse en voz alta).
- **Estratégico**: SIEMPRE cierra en **interpretación + recomendación accionable** ("Regla del Presidente":
  responde como si un presidente fuera a actuar HOY).
- **Predictivo**, **visual** (estructura breve). No inventa cifras; si falta un dato duro lo pide en 1 línea.
- El "Consejo" delibera por dentro; el usuario recibe **una sola voz integrada**.

## 3. Stack obligatorio

- **Next.js 16** (App Router + Turbopack) · **React 19** · **TypeScript** · **Tailwind 3.4** · **Framer Motion**
- **Zustand** (estado) · **Zod** (validación) · **lucide-react** (iconos)
- **Three.js 0.171** (cerebro neuronal: partículas + ShaderMaterial, additive blending)
- IA: **Vercel AI SDK v5** (`ai`, `@ai-sdk/react`) + **OpenRouter** (`@openrouter/ai-sdk-provider`)
  - conversación `anthropic/claude-opus-4.1`; intent/JSON `google/gemini-2.5-flash` y `gemini-2.5-pro`
    (Anthropic NO soporta `json_schema` vía OpenRouter → usar Gemini para `generateObject`);
    tiempo real `perplexity/sonar`; embeddings `openai/text-embedding-3-small` (1536)
- **Neon Postgres** (driver `postgres` de porsager) + **pgvector** (HNSW) para RAG
- Voz: **ElevenLabs** TTS (`/api/tts`, `eleven_multilingual_v2`) + **Web Speech API** (fallback STT/TTS)
- Gestos/visión: **@mediapipe/tasks-vision** (HandLandmarker) y **@vladmandic/face-api** — cargados desde **CDN en runtime**
- Mapas/media (sin API key): **OpenStreetMap** embed + **Nominatim**; **YouTube** + **Bing Images** (scraping)
- Deploy: **Vercel**

## 4. Arquitectura (Feature-First)

```
src/
├── core/                  # cerebro: intent-engine, orchestrator, council, context-engine, response-engine, memory-engine
├── app/api/               # hermes (stream Opus), briefing, personalization, knowledge(+upload), tts, media, map, health
├── lib/                   # ai/openrouter (MODELS), ai/embeddings, db/client (getSql)
└── features/command-center/
    ├── components/         # CommandCenter, NeuralBrain, BrainCenterpiece, CommandBar, WindowsLayer, FloatingWindow,
    │                       # HandController, FaceRecognition, PersonalizationDrawer, KnowledgeDrawer, BriefingPanel…
    ├── hooks/              # useHermes (orquesta todo), useVoice, useClapDetection, useWakeWord, useModalA11y
    ├── store/              # command-center-store.ts (Zustand)
    ├── camera.ts           # getCameraStream(cameraId) compartido (mismas constraints + reintentos) + listCameras()
    └── command-router.ts   # interpretUiCommand() + decideDisplay()
```

## 5. Cerebro (Hermes Core)

`intent-engine` (qué quiere → especialistas + urgencia + needsData/needsWeb, con Gemini) → `orchestrator`
(routing: si needsWeb → Sonar; si needsData → RAG sobre pgvector; si profundo → consejo multi-agente en
paralelo + Coordinador Opus sintetiza) → `response-engine` (arma el system prompt) → stream con Opus en
`/api/hermes`. Persistencia en Neon (tenant/conversación/mensajes/memoria/eventos).

## 6. UX inmersiva + máquina de estados de VOZ/ACTIVACIÓN (clave)

- Por defecto: **solo el cerebro** a pantalla completa (sin barra ni textos). Controles aparecen al mover el mouse.
- **STANDBY** (`awake=false`): esperando. **Doble aplauso** (o tap) → **activar**.
- **activate()** (idempotente, `if (awake) return`): `awake=true`, saluda por voz según la hora y por nombre
  (`recognizedName || operatorName`), y AL TERMINAR el saludo empieza a escuchar
  (`speak(greeting, onEnd=startListening)` — si escuchas antes, `startListening` cancela el saludo).
- **ACTIVO**: escucha continua. Hablas **o** aplaudes → atiende y responde, y vuelve a escuchar.
  Decir **"ok"** (isStopWord: ok/okey/vale/listo/gracias/cancela/para/adios…) → `deactivate()` → STANDBY.
- **Voz natural**: `speak()` pide `/api/tts` (ElevenLabs) y reproduce el audio; si falla 2 veces seguidas o no
  hay key, cae **consistente** a `speechSynthesis`. Desbloquear audio/AudioContext con el primer gesto del
  usuario (un aplauso NO es gesto para el navegador).

## 7. Aplauso (Web Audio) — gotcha importante

`useClapDetection({ enabled: clapEnabled, paused: voice.speaking, onDoubleClap })`:
- Detección de doble pico de amplitud (AnalyserNode, THRESH 0.25, MIN_GAP 130ms, MAX_GAP 750ms, con re-arme).
- **SIEMPRE activo** (no gated por `awake`). `onDoubleClap`: si standby → `activate()`; si activo → `startListening()`.
- `paused` (= `voice.speaking`) se lee por **REF dentro del loop** para pausar SOLO la detección mientras Hermes
  habla (su voz por bocinas dispararía aplausos falsos). **NO** recrear el stream/AudioContext al cambiar de
  estado: en iOS queda suspendido y el aplauso solo serviría 1 vez. Efecto dep solo `[enabled]`.

## 8. Ventanas inteligentes (mosaico) + decisión

`decideDisplay(text)` decide qué mostrar:
- preguntas del sistema/estrategia → **solo voz** (sin ventana).
- "muéstrame fotos de X" → **imagen** (Bing) · "pon un video de X" → **video** (YouTube embed).
- "mapa de X / dónde está X" → **mapa** (`/api/map`: Nominatim → OpenStreetMap embed con zoom + marcador).
- "muéstrame/abre ventana …" → **texto** (respuesta del LLM en una ventana).
`WindowsLayer` acomoda las ventanas en cuadrícula (auto-tiling); `FloatingWin.pos`/`size` (gestos) anulan el
mosaico; `expandedId` = ventana ampliada (zoom) con telón. Video con `enablejsapi=1` para play/pause por API.

## 9. CONTROL POR GESTOS CON LA MANO (detalle para reimplementar)

Componente `HandController` (opt-in `gestureEnabled`). Carga **MediaPipe HandLandmarker desde CDN en runtime**
(porque `npm install` puede fallar): importar con `new Function('u','return import(u)')(ESM_URL)` para evitar
que el bundler lo resuelva. URLs:
- ESM: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm`
- WASM: `.../tasks-vision@0.10.18/wasm` · modelo: `hand_landmarker.task` (Google storage, float16)
- Config: `runningMode:'VIDEO'`, `numHands:2`, `delegate:'GPU'` con fallback a `'CPU'`.

Flujo: abrir cámara PRIMERO (`getCameraStream(cameraId)`, preview inmediato) y cargar el modelo en 2º plano;
loop con `requestAnimationFrame` → `landmarker.detectForVideo(video, performance.now())`.

**Posición** del cursor/gestos = **punta del índice** (landmark 8), espejada en X: `x=(1-lm[8].x)*W`, `y=lm[8].y*H`.

**Métricas por mano** (landmarks MediaPipe: 0=muñeca, 4=pulgar, 8=índice, 12=medio, 16=anular, 20=meñique;
6/10/14/18 = PIP de cada dedo; 2/3 = nudillos del pulgar; 9 = MCP medio):
- `handSize = dist(0, 9)`
- `pinch = dist(4,8)/handSize < 0.6`
- `curled(tip,pip) = dist(tip,0) < dist(pip,0)` (punta más cerca de la muñeca que su PIP → robusto a escala/orientación)
- `thumbUp = lm[4].y < lm[2].y - 0.04 && dist(4,0) > dist(3,0)`

**Gestos → acciones** (cada gesto destructivo se "arma" primero: solo cuenta tras ver la mano ABIERTA
—los 4 dedos extendidos—; y requiere ~7 cuadros sostenidos):

| Gesto | Detección | Acción |
|---|---|---|
| Mover | 1 mano `pinch` sobre ventana | `updateWindow(pos)` siguiendo la mano (offset = cursor − topLeft) |
| Redimensionar | 2 manos `pinch` (≥2) | escala = distancia_actual / distancia_inicial, ancla al centro; engancha con 2 pellizcos y **sigue con la distancia entre las 2 manos aunque el pellizco parpadee** (margen de gracia ~8 cuadros) → `updateWindow(pos,size)` |
| Cerrar | 1 dedo (índice extendido, resto recogido), armado | `removeWindow(id)` de la ventana bajo el cursor |
| Pausar | 2 dedos (índice+medio extendidos, anular+meñique recogidos) | `postMessage('{"event":"command","func":"pauseVideo"}')` al iframe |
| Reproducir/Reanudar | `thumbUp` (👍), armado | `setExpandedId(id)` (amplía+autoplay) **+** `postMessage(playVideo)` (reanuda si estaba en pausa) |
| Siguiente/Anterior | mano ABIERTA deslizando horizontal (Δx > 28% ancho) | `dispatchEvent('hermes-media-step', {id, dir})` → MediaView cambia el video |

Ventana objetivo = `document.elementFromPoint(x,y).closest('[data-win-id]')` (el cursor es `pointer-events-none`,
no estorba). Cursor: un anillo por mano que cambia de color/ícono según el gesto. `camera.ts` comparte las
constraints (deviceId elegible) y reintenta `NotReadableError`.

## 10. Reconocimiento facial

`FaceRecognition` (opt-in `faceEnabled`): **@vladmandic/face-api** desde CDN. Modelos:
tinyFaceDetector + faceLandmark68Net + faceRecognitionNet. Enrolas tu rostro UNA vez (descriptor 128-d en
`localStorage`); el loop hace `detectSingleFace().withFaceLandmarks().withFaceDescriptor()`, compara con
`euclideanDistance < 0.55` → setea `recognizedName` (que usa el saludo). Guardas: `if (cancelled) return` tras
el await; detener el stream si falla la carga; limpiar el nombre si aparece otro rostro.

## 11. Personalización (white-label, sin código)

Tenant en Neon: `assistantName, orgName, accentRgb` (CSS var `--hermes-accent`), `countryFlag, partyLogo,
backgroundImage` (foto/logo a pantalla completa, cerebro delante), `brainVariant` (aurora/jarvis/plasma/matrix/gold),
`visualStyle`. En dispositivo (localStorage): `operatorName` (saludo, máx 30), `cameraId`, `controls`
(qué iconos mostrar: clap/gesture/face/voice/settings).

## 12. Variables de entorno + deploy

`.env.local`: `OPENROUTER_API_KEY`, `DATABASE_URL` (Neon), `NEXT_PUBLIC_SITE_URL/NAME`, `ELEVENLABS_API_KEY`,
`ELEVENLABS_VOICE_ID`. `npm run migrate` crea tablas (idempotente). Deploy en Vercel.

## 13. Gotchas críticos (evita repetir nuestros errores)

1. **OpenRouter + Anthropic**: no soporta `json_schema` → usa Gemini para salida estructurada.
2. **conversationId**: el body Zod debe ser `.uuid().nullable().optional()` (el 1er turno manda `null`).
3. **Aplauso**: mantener el micrófono/AudioContext VIVO; pausar la detección por ref, no recrear el stream
   (iOS lo suspende). Pausar la detección mientras Hermes habla.
4. **Foco en modales**: `useModalA11y` NO debe depender de `onClose` inline (cambia cada render → re-enfoca en
   cada tecla y el input "salta"). Usar ref para onClose; dep `[open, ref]`.
5. **Voz ElevenLabs**: plan gratis ≈10k chars/mes; al agotarse cae a la voz del navegador. Voces de **librería**
   (p.ej. mexicana "Karim") dan 402 en plan gratis → usar voz **premade**. NO enganchar el fallback salvo 501.
6. **iOS Safari**: NO soporta Web Speech (dictado) ni bien getUserMedia/AudioContext; experiencia completa de
   voz/gestos = **Chrome de escritorio**.
7. **CDN runtime import**: cargar MediaPipe/face-api con `new Function('u','return import(u)')` para evitar el bundler.
8. **MediaPipe en headless/software-GL**: el modelo carga lentísimo; en hardware real es rápido.

---

*Este brief refleja el estado en producción (2026-06-27). Es suficiente para que otro modelo reconstruya el
sistema completo, incluyendo los gestos con la mano.*
