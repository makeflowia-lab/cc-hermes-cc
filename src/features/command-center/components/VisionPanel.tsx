'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, CameraOff } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'

// FaceDetector es experimental y no está en el DOM lib. Tipado mínimo + feature-detect.
interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<unknown[]>
}
type FaceDetectorCtor = new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike

type VisionStatus = 'starting' | 'on' | 'denied' | 'unsupported'

/**
 * Sistema de Visión (Fase 5, DOC 10). OPT-IN, apagado por defecto, con consentimiento explícito.
 * "La cámara es uno de los sentidos de Hermes" pero el reconocimiento es opcional y bajo control del cliente.
 * Usa FaceDetector si el navegador lo soporta (presencia/nº de personas); si no, modo presencia básica.
 */
export function VisionPanel() {
  const visionEnabled = useCommandCenter((s) => s.visionEnabled)
  const toggleVision = useCommandCenter((s) => s.toggleVision)
  const voiceOutput = useCommandCenter((s) => s.voiceOutput)
  const personalization = useCommandCenter((s) => s.personalization)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<VisionStatus>('starting')
  const [faces, setFaces] = useState<number | null>(null)

  // Refs para no reiniciar la cámara al cambiar voz/personalización.
  const voiceRef = useRef(voiceOutput)
  voiceRef.current = voiceOutput
  const nameRef = useRef(personalization?.assistantName ?? 'Hermes')
  nameRef.current = personalization?.assistantName ?? 'Hermes'

  useEffect(() => {
    if (!visionEnabled) return
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let greeted = false
    setStatus('starting')
    setFaces(null)

    const greet = () => {
      if (!voiceRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) return
      // No interrumpir si Hermes (u otra voz) ya está hablando — comparten el mismo synth.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return
      const u = new SpeechSynthesisUtterance(`Bienvenido. ${nameRef.current} a tu servicio.`)
      u.lang = 'es-MX'
      window.speechSynthesis.speak(u)
    }

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        const Ctor = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector
        if (!Ctor) {
          setStatus('unsupported')
          return
        }
        setStatus('on')
        let detector: FaceDetectorLike | null = null
        try {
          detector = new Ctor({ fastMode: true, maxDetectedFaces: 5 })
        } catch {
          setStatus('unsupported')
          return
        }
        const loop = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const found = await detector!.detect(videoRef.current)
            if (cancelled) return // la cámara pudo apagarse durante el await
            setFaces(found.length)
            if (found.length > 0 && !greeted) {
              greeted = true
              greet()
            }
          } catch {
            /* frame no listo */
          }
          if (!cancelled) timer = setTimeout(loop, 1500)
        }
        loop()
      } catch {
        setStatus('denied')
      }
    }
    start()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [visionEnabled])

  const statusText: Record<VisionStatus, string> = {
    starting: 'Iniciando cámara…',
    on: faces === null ? 'Analizando…' : faces > 0 ? `Presencia detectada (${faces})` : 'Sin presencia',
    denied: 'Permiso de cámara denegado',
    unsupported: 'Cámara activa · detección de rostros no soportada aquí',
  }

  return (
    <AnimatePresence>
      {visionEnabled && (
        <motion.div
          className="glass glass-accent fixed bottom-28 left-4 z-30 w-56 overflow-hidden rounded-2xl p-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-300">
              <Eye className="h-3.5 w-3.5 accent" aria-hidden="true" />
              Visión
            </span>
            <button
              type="button"
              onClick={toggleVision}
              title="Apagar cámara"
              aria-label="Apagar visión"
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-state-crisis"
            >
              <CameraOff className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-32 w-full -scale-x-100 rounded-lg bg-black/40 object-cover"
          />
          <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-slate-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${faces && faces > 0 ? 'bg-state-normal' : 'bg-slate-600'}`}
            />
            {statusText[status]}
          </div>
          <p className="mt-1 px-1 text-[9px] leading-tight text-slate-500">
            Opt-in. El video se procesa localmente en tu navegador; no se almacena.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
