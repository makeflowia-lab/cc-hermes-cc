'use client'

import { useEffect, useRef, useState } from 'react'
import { useCommandCenter } from '../store/command-center-store'
import { getCameraStream } from '../camera'
import { cn } from '@/lib/utils'

/**
 * Control por GESTOS con la mano (estilo Jarvis). MediaPipe Hands (CDN, runtime).
 * - PELLIZCA (pulgar+índice), UNA mano sobre una ventana → la mueves.
 * - PELLIZCA con LAS DOS MANOS sobre una ventana → la REDIMENSIONAS (estirar/encoger).
 * - PUÑO (mano cerrada) sobre una ventana → la cierra.
 * - PULGAR ARRIBA 👍 sobre una ventana → la amplía / reproduce el video.
 * Cada gesto debe "armarse" abriendo la mano antes (evita cierres accidentales al soltar un pellizco).
 */

const ESM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const importESM = (u: string) =>
  (new Function('u', 'return import(u)') as (u: string) => Promise<Record<string, unknown>>)(u)

type Gesture = 'pinch' | 'fist' | 'thumb' | 'two' | null
type Cursor = { x: number; y: number; gesture: Gesture }
type Pt = { x: number; y: number }

function winIdAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  const w = el?.closest?.('[data-win-id]') as HTMLElement | null
  return w?.dataset.winId ?? null
}

// Pausa el video de YouTube embebido en una ventana (IFrame API).
function pauseVideoIn(id: string) {
  const iframe = document.querySelector(`[data-win-id="${id}"] iframe`) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
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
    let armed = false // un gesto (puño/pulgar) solo cuenta tras ver la mano ABIERTA (evita falsos positivos)
    let fistFrames = 0
    let thumbFrames = 0
    let twoFrames = 0 // 2 dedos sostenidos (pausar video)
    let swipeStart: Pt | null = null // posición inicial de la mano abierta (deslizar = siguiente/anterior)
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
            const pinches: Pt[] = []
            let fistAt: Pt | null = null
            let thumbAt: Pt | null = null
            let twoAt: Pt | null = null
            let openAt: Pt | null = null
            let anyOpen = false

            for (const lm of hands) {
              if (!lm || lm.length < 9) continue
              const wr = lm[0]
              const mc = lm[9]
              const x = (1 - (lm[4].x + lm[8].x) / 2) * W()
              const y = ((lm[4].y + lm[8].y) / 2) * H()
              const hs = Math.hypot(wr.x - mc.x, wr.y - mc.y) || 1e-4
              const pinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) / hs < 0.6
              // Dedo recogido: la punta está más cerca de la muñeca que su nudillo PIP (robusto a escala/orientación).
              const curled = (tip: number, pip: number) =>
                Math.hypot(lm[tip].x - wr.x, lm[tip].y - wr.y) < Math.hypot(lm[pip].x - wr.x, lm[pip].y - wr.y)
              let gesture: Gesture = pinch ? 'pinch' : null
              if (!pinch && lm.length >= 21) {
                const fingersCurled = curled(8, 6) && curled(12, 10) && curled(16, 14) && curled(20, 18)
                const fingersOpen = !curled(8, 6) && !curled(12, 10) && !curled(16, 14) && !curled(20, 18)
                // Pulgar ARRIBA: punta del pulgar por encima de su nudillo y extendida.
                const thumbUp =
                  lm[4].y < lm[2].y - 0.04 &&
                  Math.hypot(lm[4].x - wr.x, lm[4].y - wr.y) > Math.hypot(lm[3].x - wr.x, lm[3].y - wr.y)
                // 2 DEDOS (índice+medio extendidos, anular+meñique recogidos) → pausar.
                const twoFingers = !curled(8, 6) && !curled(12, 10) && curled(16, 14) && curled(20, 18)
                if (fingersOpen) {
                  anyOpen = true
                  if (!openAt) openAt = { x, y }
                }
                if (fingersCurled && thumbUp) {
                  gesture = 'thumb'
                  if (!thumbAt) thumbAt = { x, y }
                } else if (fingersCurled) {
                  gesture = 'fist'
                  if (!fistAt) fistAt = { x, y }
                } else if (twoFingers) {
                  gesture = 'two'
                  if (!twoAt) twoAt = { x, y }
                }
              }
              cs.push({ x, y, gesture })
              if (pinch) pinches.push({ x, y })
            }

            if (pinches.length >= 2) {
              // REDIMENSIONAR a dos manos.
              grab = null
              fistFrames = 0
              thumbFrames = 0
              const a = pinches[0]
              const b = pinches[1]
              const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
              if (!resize) {
                const id = winIdAt((a.x + b.x) / 2, (a.y + b.y) / 2) || winIdAt(a.x, a.y) || winIdAt(b.x, b.y)
                if (id) {
                  const el = document.querySelector(`[data-win-id="${id}"]`) as HTMLElement | null
                  if (el) {
                    const r = el.getBoundingClientRect()
                    resize = { id, dist0: dist, w0: r.width, h0: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
                  }
                }
              }
              if (resize) {
                const scale = Math.min(4, Math.max(0.3, dist / resize.dist0))
                const w = Math.min(W() * 0.95, Math.max(220, resize.w0 * scale))
                const h = Math.min(H() * 0.9, Math.max(160, resize.h0 * scale))
                store().updateWindow(resize.id, { pos: { x: resize.cx - w / 2, y: resize.cy - h / 2 }, size: { w, h } })
              }
            } else {
              resize = null
              // MOVER con una mano (pellizco).
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

              // Armar el gesto al ver la mano ABIERTA (impide cierres accidentales al soltar un pellizco).
              if (anyOpen) armed = true

              if (armed && fistAt) {
                fistFrames += 1
                thumbFrames = 0
                twoFrames = 0
                if (fistFrames >= 7) {
                  const id = winIdAt(fistAt.x, fistAt.y)
                  if (id) store().removeWindow(id)
                  armed = false
                  fistFrames = 0
                }
              } else if (armed && thumbAt) {
                thumbFrames += 1
                fistFrames = 0
                twoFrames = 0
                if (thumbFrames >= 7) {
                  const id = winIdAt(thumbAt.x, thumbAt.y)
                  if (id) store().setExpandedId(id) // amplía → el video hace autoplay
                  armed = false
                  thumbFrames = 0
                }
              } else if (twoAt) {
                // PAUSAR video (2 dedos). No requiere armado (es inofensivo).
                twoFrames += 1
                fistFrames = 0
                thumbFrames = 0
                if (twoFrames === 7) {
                  const id = winIdAt(twoAt.x, twoAt.y)
                  if (id) pauseVideoIn(id)
                }
              } else {
                fistFrames = 0
                thumbFrames = 0
                twoFrames = 0
              }

              // DESLIZAR la mano abierta → siguiente (derecha) / anterior (izquierda) video.
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
              fistFrames = 0
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
    g === 'fist'
      ? 'h-7 w-7 border-2 bg-rose-500/40'
      : g === 'thumb'
        ? 'h-7 w-7 border-2 bg-emerald-500/40'
        : g === 'two'
          ? 'h-7 w-7 border-2 bg-amber-400/40'
          : g === 'pinch'
            ? 'h-5 w-5 border-2 bg-accent/50'
            : 'h-9 w-9 border-2'
  const ringColor = (g: Gesture) =>
    g === 'fist'
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
            {c.gesture === 'fist' && <span className="text-[10px] font-bold text-white">✕</span>}
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
