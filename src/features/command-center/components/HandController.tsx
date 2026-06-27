'use client'

import { useEffect, useRef, useState } from 'react'
import { useCommandCenter } from '../store/command-center-store'
import { getCameraStream } from '../camera'
import { cn } from '@/lib/utils'

/**
 * Control por GESTOS con la mano (estilo Jarvis). MediaPipe Hands (CDN, runtime). Posición = punta del índice.
 * - PELLIZCA (pulgar+índice), 1 mano sobre una ventana → mover.
 * - PELLIZCA con LAS 2 MANOS y separa/junta → redimensionar (maximizar).
 * - 1 DEDO (índice apuntando) sobre una ventana → cerrar.
 * - 2 DEDOS (índice+medio) sobre un video → pausar.
 * - 👍 PULGAR ARRIBA sobre una ventana → reproducir / ampliar.
 * - MANO ABIERTA deslizando → siguiente/anterior video.
 * Cerrar/reproducir se "arman" abriendo la mano antes (evita disparos accidentales).
 */

const ESM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const importESM = (u: string) =>
  (new Function('u', 'return import(u)') as (u: string) => Promise<Record<string, unknown>>)(u)

type Gesture = 'pinch' | 'one' | 'two' | 'thumb' | null
type Cursor = { x: number; y: number; gesture: Gesture }
type Pt = { x: number; y: number }

function winIdAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  const w = el?.closest?.('[data-win-id]') as HTMLElement | null
  return w?.dataset.winId ?? null
}

function pauseVideoIn(id: string) {
  const iframe = document.querySelector(`[data-win-id="${id}"] iframe`) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
}

function playVideoIn(id: string) {
  const iframe = document.querySelector(`[data-win-id="${id}"] iframe`) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
}

export function HandController() {
  const cameraId = useCommandCenter((s) => s.cameraId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'camera' | 'ready' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('No se pudo iniciar la cámara')
  const [cursors, setCursors] = useState<Cursor[]>([])

  useEffect(() => {
    let cancelled = false
    let raf = 0
    let stream: MediaStream | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any = null
    let lastVideoTime = -1
    let gotCamera = false
    // Estado entre cuadros.
    let grab: { id: string; dx: number; dy: number } | null = null
    let resize: { id: string; dist0: number; w0: number; h0: number; cx: number; cy: number } | null = null
    let resizeGrace = 0
    let armed = false
    let oneFrames = 0
    let thumbFrames = 0
    let twoFrames = 0
    let swipeStart: Pt | null = null
    let swipeFiredAt = 0

    ;(async () => {
      try {
        stream = await getCameraStream(cameraId)
        gotCamera = true
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play().catch(() => {})
        if (!cancelled) setStatus('camera')

        for (let attempt = 0; ; attempt++) {
          try {
            const vision = await importESM(ESM_URL)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { HandLandmarker, FilesetResolver } = vision as any
            const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
            const make = (delegate: 'GPU' | 'CPU') =>
              HandLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate },
                runningMode: 'VIDEO',
                numHands: 2,
              })
            landmarker = await make('GPU').catch(() => make('CPU'))
            break
          } catch (e) {
            if (cancelled) return
            if (attempt >= 3) throw e
            await new Promise((r) => setTimeout(r, 1000))
          }
        }
        if (cancelled) return
        setStatus('ready')

        const W = () => window.innerWidth
        const H = () => window.innerHeight
        const store = () => useCommandCenter.getState()

        const loop = () => {
          if (cancelled) return
          const v = videoRef.current
          if (v && v.readyState >= 2 && v.currentTime !== lastVideoTime) {
            lastVideoTime = v.currentTime
            let res: { landmarks?: Array<Array<{ x: number; y: number }>> } | null = null
            try {
              res = landmarker.detectForVideo(v, performance.now())
            } catch {
              res = null
            }
            const hands = res?.landmarks ?? []
            const cs: Cursor[] = []
            const allPts: Pt[] = []
            const pinchPts: Pt[] = []
            let oneAt: Pt | null = null
            let twoAt: Pt | null = null
            let thumbAt: Pt | null = null
            let openAt: Pt | null = null
            let anyOpen = false

            for (const lm of hands) {
              if (!lm || lm.length < 9) continue
              const wr = lm[0]
              const mc = lm[9]
              // Posición = PUNTA DEL ÍNDICE (donde apuntas), espejada en X.
              const x = (1 - lm[8].x) * W()
              const y = lm[8].y * H()
              const hs = Math.hypot(wr.x - mc.x, wr.y - mc.y) || 1e-4
              const pinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) / hs < 0.6
              const curled = (tip: number, pip: number) =>
                Math.hypot(lm[tip].x - wr.x, lm[tip].y - wr.y) < Math.hypot(lm[pip].x - wr.x, lm[pip].y - wr.y)
              let gesture: Gesture = pinch ? 'pinch' : null
              if (!pinch && lm.length >= 21) {
                const iUp = !curled(8, 6)
                const mUp = !curled(12, 10)
                const rUp = !curled(16, 14)
                const pUp = !curled(20, 18)
                const thumbUp =
                  lm[4].y < lm[2].y - 0.04 &&
                  Math.hypot(lm[4].x - wr.x, lm[4].y - wr.y) > Math.hypot(lm[3].x - wr.x, lm[3].y - wr.y)
                if (iUp && mUp && rUp && pUp) {
                  anyOpen = true
                  if (!openAt) openAt = { x, y }
                } else if (!iUp && !mUp && !rUp && !pUp && thumbUp) {
                  gesture = 'thumb'
                  if (!thumbAt) thumbAt = { x, y }
                } else if (iUp && !mUp && !rUp && !pUp) {
                  gesture = 'one' // 1 dedo = cerrar
                  if (!oneAt) oneAt = { x, y }
                } else if (iUp && mUp && !rUp && !pUp) {
                  gesture = 'two' // 2 dedos = pausar
                  if (!twoAt) twoAt = { x, y }
                }
              }
              cs.push({ x, y, gesture })
              allPts.push({ x, y })
              if (pinch) pinchPts.push({ x, y })
            }

            // REDIMENSIONAR: engancha con 2 pellizcos; sigue con la distancia de las 2 manos aunque
            // el pellizco parpadee (margen de gracia), hasta que ya no haya 2 manos.
            if (!resize && pinchPts.length >= 2) {
              const a = pinchPts[0]
              const b = pinchPts[1]
              const id = winIdAt((a.x + b.x) / 2, (a.y + b.y) / 2) || winIdAt(a.x, a.y) || winIdAt(b.x, b.y)
              if (id) {
                const el = document.querySelector(`[data-win-id="${id}"]`) as HTMLElement | null
                if (el) {
                  const r = el.getBoundingClientRect()
                  resize = { id, dist0: Math.hypot(a.x - b.x, a.y - b.y) || 1, w0: r.width, h0: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
                  resizeGrace = 8
                }
              }
            }

            if (resize) {
              if (allPts.length >= 2) {
                resizeGrace = 8
                const a = allPts[0]
                const b = allPts[1]
                const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
                const scale = Math.min(4, Math.max(0.3, dist / resize.dist0))
                const w = Math.min(W() * 0.95, Math.max(220, resize.w0 * scale))
                const h = Math.min(H() * 0.9, Math.max(160, resize.h0 * scale))
                store().updateWindow(resize.id, { pos: { x: resize.cx - w / 2, y: resize.cy - h / 2 }, size: { w, h } })
              } else {
                resizeGrace -= 1
                if (resizeGrace <= 0) resize = null
              }
              grab = null
              oneFrames = 0
              thumbFrames = 0
              twoFrames = 0
            } else {
              // MOVER (1 pellizco).
              const p = cs.find((c) => c.gesture === 'pinch')
              if (p) {
                if (grab) store().updateWindow(grab.id, { pos: { x: p.x - grab.dx, y: p.y - grab.dy } })
                else {
                  const id = winIdAt(p.x, p.y)
                  if (id) {
                    const el = document.querySelector(`[data-win-id="${id}"]`) as HTMLElement | null
                    if (el) {
                      const r = el.getBoundingClientRect()
                      grab = { id, dx: p.x - r.left, dy: p.y - r.top }
                    }
                  }
                }
              } else {
                grab = null
              }

              if (anyOpen) armed = true

              if (armed && oneAt) {
                // CERRAR (1 dedo, requiere armado).
                oneFrames += 1
                thumbFrames = 0
                twoFrames = 0
                if (oneFrames >= 7) {
                  const id = winIdAt(oneAt.x, oneAt.y)
                  if (id) store().removeWindow(id)
                  armed = false
                  oneFrames = 0
                }
              } else if (armed && thumbAt) {
                // REPRODUCIR / AMPLIAR (pulgar, requiere armado).
                thumbFrames += 1
                oneFrames = 0
                twoFrames = 0
                if (thumbFrames >= 7) {
                  const id = winIdAt(thumbAt.x, thumbAt.y)
                  if (id) {
                    store().setExpandedId(id) // amplía (y autoplay la 1a vez)
                    playVideoIn(id) // reanuda si estaba en pausa (API de YouTube)
                  }
                  armed = false
                  thumbFrames = 0
                }
              } else if (twoAt) {
                // PAUSAR (2 dedos).
                twoFrames += 1
                oneFrames = 0
                thumbFrames = 0
                if (twoFrames === 7) {
                  const id = winIdAt(twoAt.x, twoAt.y)
                  if (id) pauseVideoIn(id)
                }
              } else {
                oneFrames = 0
                thumbFrames = 0
                twoFrames = 0
              }

              // DESLIZAR mano abierta → siguiente/anterior video.
              if (openAt) {
                if (!swipeStart) swipeStart = openAt
                const dx = openAt.x - swipeStart.x
                const now = performance.now()
                if (Math.abs(dx) > W() * 0.28 && now - swipeFiredAt > 900) {
                  const id = winIdAt(swipeStart.x, swipeStart.y)
                  if (id) window.dispatchEvent(new CustomEvent('hermes-media-step', { detail: { id, dir: dx > 0 ? 1 : -1 } }))
                  swipeFiredAt = now
                  swipeStart = openAt
                }
              } else {
                swipeStart = null
              }
            }

            if (hands.length === 0) {
              grab = null
              resize = null
              resizeGrace = 0
              oneFrames = 0
              thumbFrames = 0
              twoFrames = 0
              swipeStart = null
            }
            setCursors(cs)
          }
          raf = requestAnimationFrame(loop)
        }
        loop()
      } catch (e) {
        console.error('[hand]', e)
        if (!cancelled) {
          stream?.getTracks().forEach((t) => t.stop())
          const name = (e as { name?: string })?.name
          setErrMsg(
            gotCamera
              ? 'No se pudo cargar la detección de mano (red inestable). Reactiva los gestos para reintentar.'
              : name === 'NotReadableError'
                ? 'La cámara está en uso por otra app o pestaña. Ciérrala y reactiva los gestos.'
                : name === 'NotAllowedError'
                  ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
                  : name === 'NotFoundError'
                    ? 'No se encontró ninguna cámara.'
                    : 'No se pudo iniciar la cámara.',
          )
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      try {
        landmarker?.close?.()
      } catch {
        /* noop */
      }
    }
  }, [cameraId])

  const ringClass = (g: Gesture) =>
    g === 'one'
      ? 'h-7 w-7 border-2 bg-rose-500/40'
      : g === 'thumb'
        ? 'h-7 w-7 border-2 bg-emerald-500/40'
        : g === 'two'
          ? 'h-7 w-7 border-2 bg-amber-400/40'
          : g === 'pinch'
            ? 'h-5 w-5 border-2 bg-accent/50'
            : 'h-9 w-9 border-2'
  const ringColor = (g: Gesture) =>
    g === 'one'
      ? 'rgb(244,63,94)'
      : g === 'thumb'
        ? 'rgb(16,185,129)'
        : g === 'two'
          ? 'rgb(251,191,36)'
          : g === 'pinch'
            ? 'rgb(var(--hermes-accent))'
            : 'rgba(255,255,255,0.75)'

  return (
    <>
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none fixed bottom-3 right-3 z-[45] h-24 w-32 -scale-x-100 rounded-lg border border-hairline object-cover opacity-50"
      />

      {cursors.map((c, i) => (
        <div
          key={i}
          className="pointer-events-none fixed z-[60]"
          style={{ left: c.x, top: c.y, transform: 'translate(-50%, -50%)' }}
          aria-hidden="true"
        >
          <div
            className={cn('flex items-center justify-center rounded-full transition-all duration-100', ringClass(c.gesture))}
            style={{ borderColor: ringColor(c.gesture), boxShadow: `0 0 14px ${ringColor(c.gesture)}` }}
          >
            {c.gesture === 'one' && <span className="text-[10px] font-bold text-white">✕</span>}
            {c.gesture === 'thumb' && <span className="text-[10px] font-bold text-white">▶</span>}
            {c.gesture === 'two' && <span className="text-[10px] font-bold text-white">⏸</span>}
          </div>
        </div>
      ))}

      {status !== 'ready' && (
        <div className="pointer-events-none fixed bottom-28 right-3 z-[60] max-w-[220px] rounded-md bg-black/70 px-2 py-1 text-[10px] text-slate-300">
          {status === 'loading' ? 'Iniciando cámara…' : status === 'camera' ? 'Cargando detección de mano…' : errMsg}
        </div>
      )}
    </>
  )
}
