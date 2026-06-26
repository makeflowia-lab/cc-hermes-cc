'use client'

import { useEffect, useRef } from 'react'

// Palabra de activación (DOC 09 §11 Wake Word System). "Hermes" / "Centro de mando".
export const WAKE_WORDS = ['hermes', 'centro de mando']

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { 0: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type Ctor = new () => RecognitionLike

function getCtor(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Escucha continua de la palabra de activación. Solo una SpeechRecognition puede correr a la vez,
 * así que se pausa mientras hay captura de comando o TTS activo (`paused`) y se reanuda después.
 */
export function useWakeWord({
  enabled,
  paused,
  onWake,
}: {
  enabled: boolean
  paused: boolean
  onWake: () => void
}) {
  const onWakeRef = useRef(onWake)
  onWakeRef.current = onWake

  useEffect(() => {
    const Ctor = getCtor()
    if (!Ctor || !enabled || paused) return

    let stopped = false
    const rec = new Ctor()
    rec.lang = 'es-MX'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase()
        if (WAKE_WORDS.some((w) => t.includes(w))) {
          stopped = true
          try {
            rec.stop()
          } catch {
            /* noop */
          }
          onWakeRef.current()
          return
        }
      }
    }
    rec.onerror = () => {
      /* ignora; onend reintenta */
    }
    rec.onend = () => {
      // El reconocimiento continuo termina solo (silencio); reanuda si sigue activo.
      if (!stopped && enabled && !paused) {
        try {
          rec.start()
        } catch {
          /* noop */
        }
      }
    }

    try {
      rec.start()
    } catch {
      /* noop */
    }

    return () => {
      stopped = true
      try {
        rec.stop()
      } catch {
        /* noop */
      }
    }
  }, [enabled, paused])
}
