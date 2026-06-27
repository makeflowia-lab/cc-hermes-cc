'use client'

import { useEffect, useRef, useState } from 'react'
import { useCommandCenter } from '../store/command-center-store'
import { cn } from '@/lib/utils'

/**
 * Control por GESTOS con la mano (DOC: interacción tipo Jarvis/Minority Report).
 * - Cámara + MediaPipe Hands (cargado desde CDN en runtime; no requiere instalar dependencias).
 * - PELLIZCA (pulgar + índice) sobre una ventana para "agarrarla" y muévela con la mano; suelta para soltar.
 * - Un cursor en pantalla sigue tu mano (anillo) y se vuelve sólido al pellizcar.
 */

const ESM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

// import dinámico de una URL sin que el bundler (webpack/Turbopack) intente resolverlo.
const importESM = (u: string) =>
  (new Function('u', 'return import(u)') as (u: string) => Promise<Record<string, unknown>>)(u)

export function HandController() {
  const updateWindow = useCommandCenter((s) => s.updateWindow)
  const videoRef = useRef<HTMLVideoElement>(null)
  const grabRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const [status, setStatus] = useState<'loading' | 'camera' | 'ready' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('No se pudo iniciar la cámara')
  const [cursor, setCursor] = useState({ x: 0, y: 0, pinch: false, closing: false, visible: false })

  useEffect(() => {
    let cancelled = false
    let raf = 0
    let stream: MediaStream | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any = null
    let lastVideoTime = -1
    let pinching = false // histéresis
    let fistFrames = 0 // cuadros seguidos con la mano cerrada (gesto de cerrar ventana)
    let gotCamera = false

    // Empieza/continúa/termina el "agarre" de una ventana bajo el cursor.
    const handlePinch = (x: number, y: number, pinch: boolean) => {
      if (!pinch) {
        grabRef.current = null
        return
      }
      if (grabRef.current) {
        updateWindow(grabRef.current.id, { pos: { x: x - grabRef.current.dx, y: y - grabRef.current.dy } })
        return
      }
      // Inicio del pellizco: ¿hay una ventana debajo? (el cursor es pointer-events-none, no estorba)
      const el = document.elementFromPoint(x, y) as HTMLElement | null
      const winEl = el?.closest('[data-win-id]') as HTMLElement | null
      if (winEl?.dataset.winId) {
        const r = winEl.getBoundingClientRect()
        grabRef.current = { id: winEl.dataset.winId, dx: x - r.left, dy: y - r.top }
      }
    }

    // getUserMedia con reintentos: NotReadableError/AbortError suelen ser transitorios
    // (cámara recién liberada, o doble montaje de StrictMode en dev) → reintenta unas veces.
    const getCamera = async (): Promise<MediaStream> => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        } catch (e) {
          const name = (e as { name?: string })?.name
          const transient = name === 'NotReadableError' || name === 'AbortError'
          if (attempt >= 4 || !transient) throw e
          await new Promise((r) => setTimeout(r, 600))
        }
      }
    }

    ;(async () => {
      try {
        // 1) Cámara PRIMERO → vista previa inmediata (no esperar al modelo).
        stream = await getCamera()
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play().catch(() => {})
        gotCamera = true
        if (!cancelled) setStatus('camera')

        // 2) Modelo de mano en segundo plano (CDN). Se reintenta: la descarga del WASM/modelo (varios MB)
        //    puede abortarse por red inestable ("wasm streaming compile failed").
        for (let attempt = 0; ; attempt++) {
          try {
            const vision = await importESM(ESM_URL)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { HandLandmarker, FilesetResolver } = vision as any
            const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
            const makeLandmarker = (delegate: 'GPU' | 'CPU') =>
              HandLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate },
                runningMode: 'VIDEO',
                numHands: 1,
              })
            // Intenta GPU; si falla (drivers/SO), cae a CPU para no quedarse sin gestos.
            landmarker = await makeLandmarker('GPU').catch(() => makeLandmarker('CPU'))
            break
          } catch (e) {
            if (cancelled) return
            if (attempt >= 3) throw e
            await new Promise((r) => setTimeout(r, 1000)) // reintenta la descarga
          }
        }
        if (cancelled) return
        setStatus('ready')

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
            const lm = res?.landmarks?.[0]
            if (lm && lm.length >= 13) {
              const thumb = lm[4]
              const index = lm[8]
              // Punto de pellizco = punto medio pulgar/índice, espejado en X (cámara selfie).
              const x = (1 - (thumb.x + index.x) / 2) * window.innerWidth
              const y = ((thumb.y + index.y) / 2) * window.innerHeight
              // Distancia de pellizco normalizada por el tamaño de la mano (muñeca→nudillo medio).
              const handSize = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y) || 0.0001
              const ratio = Math.hypot(thumb.x - index.x, thumb.y - index.y) / handSize
              pinching = pinching ? ratio < 0.85 : ratio < 0.55 // histéresis (evita parpadeo)
              handlePinch(x, y, pinching)

              // PUÑO = cerrar ventana: dedos medio/anular/meñique recogidos hacia la muñeca (y sin pellizcar).
              let closing = false
              if (lm.length >= 21 && !pinching) {
                const curl = (tip: number) => Math.hypot(lm[tip].x - lm[0].x, lm[tip].y - lm[0].y) / handSize
                if (curl(12) < 1.2 && curl(16) < 1.1 && curl(20) < 1.0) closing = true
              }
              if (closing) {
                fistFrames += 1
                if (fistFrames === 8) {
                  // cierra la ventana bajo la mano (una sola vez por puño)
                  const el = document.elementFromPoint(x, y) as HTMLElement | null
                  const winEl = el?.closest('[data-win-id]') as HTMLElement | null
                  if (winEl?.dataset.winId) useCommandCenter.getState().removeWindow(winEl.dataset.winId)
                }
              } else {
                fistFrames = 0
              }

              setCursor({ x, y, pinch: pinching, closing, visible: true })
            } else {
              grabRef.current = null
              pinching = false
              fistFrames = 0
              setCursor((c) => (c.visible ? { ...c, visible: false, pinch: false, closing: false } : c))
            }
          }
          raf = requestAnimationFrame(loop)
        }
        loop()
      } catch (e) {
        console.error('[hand]', e)
        if (!cancelled) {
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
      try {
        landmarker?.close?.()
      } catch {
        /* noop */
      }
    }
  }, [updateWindow])

  return (
    <>
      {/* Vista previa (espejada) para encuadrar la mano */}
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none fixed bottom-3 right-3 z-[45] h-24 w-32 -scale-x-100 rounded-lg border border-hairline object-cover opacity-50"
      />

      {/* Cursor de la mano */}
      {cursor.visible && (
        <div
          className="pointer-events-none fixed z-[60]"
          style={{ left: cursor.x, top: cursor.y, transform: 'translate(-50%, -50%)' }}
          aria-hidden="true"
        >
          <div
            className={cn(
              'flex items-center justify-center rounded-full transition-all duration-100',
              cursor.closing ? 'h-7 w-7 border-2 bg-rose-500/40' : cursor.pinch ? 'h-5 w-5 border-2 bg-accent/50' : 'h-9 w-9 border-2',
            )}
            style={{
              borderColor: cursor.closing ? 'rgb(244,63,94)' : cursor.pinch ? 'rgb(var(--hermes-accent))' : 'rgba(255,255,255,0.75)',
              boxShadow: cursor.closing
                ? '0 0 16px rgba(244,63,94,0.8)'
                : cursor.pinch
                  ? '0 0 16px rgb(var(--hermes-accent) / 0.8)'
                  : '0 0 10px rgba(255,255,255,0.4)',
            }}
          >
            {cursor.closing && <span className="text-[10px] font-bold text-white">✕</span>}
          </div>
        </div>
      )}

      {/* Estado */}
      {status !== 'ready' && (
        <div className="pointer-events-none fixed bottom-28 right-3 z-[60] max-w-[220px] rounded-md bg-black/70 px-2 py-1 text-[10px] text-slate-300">
          {status === 'loading'
            ? 'Iniciando cámara…'
            : status === 'camera'
              ? 'Cargando detección de mano…'
              : errMsg}
        </div>
      )}
    </>
  )
}
