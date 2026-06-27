'use client'

import { useEffect, useRef } from 'react'

/**
 * Detección de DOBLE APLAUSO vía Web Audio (DOC Módulo 2: "Activación — Aplauso").
 * Escucha picos de amplitud (transientes); dos aplausos en una ventana corta → onDoubleClap.
 * Stream de micrófono propio (independiente del de voz). Opt-in vía `enabled`.
 */
export function useClapDetection({
  enabled,
  paused = false,
  onDoubleClap,
}: {
  enabled: boolean
  paused?: boolean
  onDoubleClap: () => void
}) {
  const cbRef = useRef(onDoubleClap)
  cbRef.current = onDoubleClap
  // `paused` se lee por ref dentro del loop para NO reejecutar el efecto (no recrear el micrófono/AudioContext
  // en cada frase de Hermes; en iOS eso lo dejaba suspendido y el aplauso solo servía la 1a vez).
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return

    let cancelled = false
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let raf = 0
    let lastClap = 0
    let lastOnset = 0
    let armed = true
    let removeGesture: (() => void) | null = null

    const THRESH = 0.25 // pico (−1..1) para considerar un aplauso
    const MIN_GAP = 130 // ms mínimo entre aplausos (debounce)
    const MAX_GAP = 750 // ms ventana para el segundo aplauso

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        ctx = new AC()
        ctx.resume().catch(() => {})
        // iOS/Safari: el AudioContext arranca "suspended" y SOLO se reanuda con un gesto del usuario.
        // Sin esto, el analizador recibe silencio y nunca detecta aplausos en producción (móvil).
        if (ctx.state !== 'running') {
          const resume = () => ctx?.resume().catch(() => {})
          window.addEventListener('pointerdown', resume)
          window.addEventListener('touchstart', resume)
          window.addEventListener('keydown', resume)
          removeGesture = () => {
            window.removeEventListener('pointerdown', resume)
            window.removeEventListener('touchstart', resume)
            window.removeEventListener('keydown', resume)
          }
        }
        const src = ctx.createMediaStreamSource(s)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        src.connect(analyser)
        const data = new Float32Array(analyser.fftSize)

        const loop = () => {
          if (cancelled) return
          // Pausa la DETECCIÓN (no el stream) mientras Hermes habla: su voz por bocinas no debe contar como aplauso.
          if (pausedRef.current) {
            armed = true
            lastClap = 0
            raf = requestAnimationFrame(loop)
            return
          }
          analyser.getFloatTimeDomainData(data)
          let peak = 0
          for (let i = 0; i < data.length; i++) {
            const a = Math.abs(data[i])
            if (a > peak) peak = a
          }
          const now = performance.now()
          if (peak > THRESH && armed && now - lastOnset > MIN_GAP) {
            lastOnset = now
            armed = false
            if (lastClap && now - lastClap < MAX_GAP) {
              cbRef.current()
              lastClap = 0
            } else {
              lastClap = now
            }
          }
          if (peak < THRESH * 0.4) armed = true // re-arma al bajar el nivel
          raf = requestAnimationFrame(loop)
        }
        loop()
      })
      .catch(() => {
        /* permiso denegado: simplemente no hay aplauso */
      })

    return () => {
      cancelled = true
      removeGesture?.()
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      ctx?.close().catch(() => {})
    }
  }, [enabled])
}
