'use client'

import { useEffect, useRef, useState } from 'react'
import { UserCheck, UserPlus, X } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import { getCameraStream } from '../camera'
import { cn } from '@/lib/utils'

/**
 * RECONOCIMIENTO FACIAL (face-api.js desde CDN, sin instalar dependencias).
 * - Registra tu rostro UNA vez (enrolamiento) → guarda un descriptor en el dispositivo.
 * - Luego te identifica por la cámara y deja `recognizedName` en el store para que Hermes te salude por nombre.
 * Mejor en Chrome de computadora (cámara + WebGL). Opt-in (faceEnabled).
 */

const FACEAPI_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.esm.js'
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model'
const STORE_KEY = 'hermes_face'
const MATCH_THRESHOLD = 0.55

// import dinámico de URL sin que el bundler lo resuelva (igual que MediaPipe).
const importESM = (u: string) =>
  (new Function('u', 'return import(u)') as (u: string) => Promise<Record<string, unknown>>)(u)

type Enrolled = { name: string; descriptor: number[] }

function loadEnrolled(): Enrolled | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Enrolled) : null
  } catch {
    return null
  }
}

export function FaceRecognition() {
  const operatorName = useCommandCenter((s) => s.operatorName)
  const setRecognizedName = useCommandCenter((s) => s.setRecognizedName)
  const toggleFace = useCommandCenter((s) => s.toggleFace)
  const cameraId = useCommandCenter((s) => s.cameraId)

  const videoRef = useRef<HTMLVideoElement>(null)
  const lastDescRef = useRef<Float32Array | null>(null)
  const [status, setStatus] = useState<'loading' | 'camera' | 'ready' | 'error'>('loading')
  const [hasFace, setHasFace] = useState(false)
  const [match, setMatch] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState<Enrolled | null>(() => loadEnrolled())

  // El enrolamiento lo dispara el botón; usamos un ref para leerlo desde el loop.
  const enrolledRef = useRef<Enrolled | null>(enrolled)
  enrolledRef.current = enrolled

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let faceapi: any = null
    let lastMatchAt = 0

    ;(async () => {
      try {
        stream = await getCameraStream(cameraId)
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play().catch(() => {})
        if (!cancelled) setStatus('camera')

        faceapi = await importESM(FACEAPI_URL)
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL)
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL)
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL)
        if (cancelled) return
        setStatus('ready')

        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        const loop = async () => {
          if (cancelled) return
          const v = videoRef.current
          if (v && v.readyState >= 2) {
            try {
              const det = await faceapi.detectSingleFace(v, opts).withFaceLandmarks().withFaceDescriptor()
              if (cancelled) return // se apagó durante la detección → no escribir el store
              if (det?.descriptor) {
                lastDescRef.current = det.descriptor
                setHasFace(true)
                const enr = enrolledRef.current
                if (enr) {
                  const dist = faceapi.euclideanDistance(det.descriptor, new Float32Array(enr.descriptor))
                  if (dist < MATCH_THRESHOLD) {
                    setMatch(enr.name)
                    setRecognizedName(enr.name)
                    lastMatchAt = performance.now()
                  } else {
                    // Otro rostro (no coincide): olvida el reconocimiento de inmediato (no saludar a quien no es).
                    setMatch(null)
                    if (lastMatchAt) {
                      lastMatchAt = 0
                      setRecognizedName(null)
                    }
                  }
                }
              } else {
                setHasFace(false)
                setMatch(null)
              }
            } catch {
              /* frame con error, ignora */
            }
          }
          // Olvida el reconocimiento si no te ve hace > 3s.
          if (lastMatchAt && performance.now() - lastMatchAt > 3000) {
            lastMatchAt = 0
            setRecognizedName(null)
          }
          timer = setTimeout(loop, 600)
        }
        loop()
      } catch (e) {
        console.error('[face]', e)
        // Si falla el CDN/modelos tras abrir la cámara, apágala (no dejarla grabando con estado "error").
        stream?.getTracks().forEach((t) => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      setRecognizedName(null)
    }
  }, [setRecognizedName, cameraId])

  const enroll = () => {
    const desc = lastDescRef.current
    const name = operatorName.trim()
    if (!desc || !name) return
    const rec: Enrolled = { name, descriptor: Array.from(desc) }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(rec))
    } catch {
      /* noop */
    }
    setEnrolled(rec)
    setMatch(name)
  }

  const forget = () => {
    try {
      localStorage.removeItem(STORE_KEY)
    } catch {
      /* noop */
    }
    setEnrolled(null)
    setMatch(null)
    setRecognizedName(null)
  }

  return (
    <div className="pointer-events-auto fixed bottom-3 left-3 z-[55] w-44 overflow-hidden rounded-xl border border-hairline bg-black/75 text-[11px] text-slate-200 backdrop-blur">
      <div className="flex items-center justify-between gap-1 px-2 py-1">
        <span className="flex items-center gap-1 font-medium uppercase tracking-wider text-slate-300">
          <UserCheck className={cn('h-3 w-3', match ? 'accent' : 'text-slate-400')} aria-hidden="true" />
          Rostro
        </span>
        <button type="button" onClick={toggleFace} title="Apagar reconocimiento" aria-label="Apagar reconocimiento facial" className="text-slate-400 hover:text-state-crisis">
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      <video ref={videoRef} muted playsInline aria-hidden="true" className="h-28 w-full -scale-x-100 object-cover" />
      <div className="px-2 py-1.5">
        {status === 'ready' ? (
          match ? (
            <p className="accent">Hola, {match} 👋</p>
          ) : enrolled ? (
            <p className="text-slate-400">{hasFace ? 'No te reconozco…' : 'Buscando rostro…'}</p>
          ) : !operatorName.trim() ? (
            <p className="text-slate-400">Pon tu nombre en Personalización para registrarte.</p>
          ) : (
            <button
              type="button"
              onClick={enroll}
              disabled={!hasFace}
              className="flex w-full items-center justify-center gap-1 rounded bg-accent/80 py-1 font-medium text-white disabled:opacity-40"
            >
              <UserPlus className="h-3 w-3" aria-hidden="true" /> Registrar mi rostro
            </button>
          )
        ) : (
          <p className="text-slate-400">
            {status === 'loading' || status === 'camera' ? 'Cargando reconocimiento…' : 'Cámara no disponible'}
          </p>
        )}
        {enrolled && (
          <button type="button" onClick={forget} className="mt-1 text-[10px] text-slate-500 hover:text-state-crisis">
            Olvidar mi rostro
          </button>
        )}
      </div>
    </div>
  )
}
