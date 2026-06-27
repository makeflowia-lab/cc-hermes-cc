'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ----- Tipos mínimos para Web Speech API (no están en el DOM lib por defecto) -----
interface SpeechRecognitionResultLike {
  0: { transcript: string }
  isFinal: boolean
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [i: number]: SpeechRecognitionResultLike }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Limpia markdown para que el TTS suene natural. */
function plainForSpeech(text: string): string {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface UseVoiceOptions {
  lang?: string
  onFinalTranscript?: (text: string) => void
  onListenEnd?: (hadSpeech: boolean) => void
}

export function useVoice({ lang = 'es-MX', onFinalTranscript, onListenEnd }: UseVoiceOptions = {}) {
  const [sttSupported, setSttSupported] = useState(false)
  const [ttsSupported, setTtsSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [interim, setInterim] = useState('')

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript
  const onListenEndRef = useRef(onListenEnd)
  onListenEndRef.current = onListenEnd

  useEffect(() => {
    setSttSupported(!!getRecognitionCtor())
    setTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* noop */
    }
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    // Cancela TTS para no escucharse a sí mismo.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()

    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = true
    let finalText = ''

    rec.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else interimText += res[0].transcript
      }
      setInterim(interimText || finalText)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => {
      setListening(false)
      setInterim('')
      const clean = finalText.trim()
      if (clean) onFinalRef.current?.(clean)
      onListenEndRef.current?.(!!clean) // permite el bucle de escucha continua
    }

    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [lang])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onEnd?.()
        return
      }
      const synth = window.speechSynthesis
      synth.cancel()
      synth.resume() // por si el motor quedó pausado/bloqueado
      const utt = new SpeechSynthesisUtterance(plainForSpeech(text))
      utt.lang = lang
      utt.rate = 1.02
      utt.pitch = 1
      const voices = synth.getVoices()
      const esVoice =
        voices.find((v) => v.lang?.toLowerCase().startsWith('es-mx')) ??
        voices.find((v) => v.lang?.toLowerCase().startsWith('es'))
      if (esVoice) utt.voice = esVoice
      let done = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const finish = () => {
        if (done) return
        done = true
        if (timer) clearTimeout(timer)
        setSpeaking(false)
        onEnd?.()
      }
      utt.onstart = () => setSpeaking(true)
      utt.onend = finish
      utt.onerror = finish
      // Red de seguridad: si el motor queda en silencio (sin voces) y no dispara onend, igual continuamos.
      const plain = plainForSpeech(text)
      timer = setTimeout(finish, Math.min(14000, 1800 + plain.length * 90))
      synth.speak(utt)
    },
    [lang],
  )

  const cancelSpeak = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  // Desbloquea speechSynthesis en el PRIMER gesto del usuario. Un aplauso NO cuenta como gesto,
  // así que sin esto el saludo por aplauso queda bloqueado por la política de autoplay del navegador.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    let primed = false
    const cleanup = () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('keydown', prime)
      window.removeEventListener('touchstart', prime)
    }
    const prime = () => {
      if (primed) return
      primed = true
      try {
        window.speechSynthesis.resume()
        const u = new SpeechSynthesisUtterance(' ')
        u.volume = 0
        window.speechSynthesis.speak(u)
      } catch {
        /* noop */
      }
      cleanup()
    }
    window.addEventListener('pointerdown', prime)
    window.addEventListener('keydown', prime)
    window.addEventListener('touchstart', prime)
    return cleanup
  }, [])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* noop */
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  return {
    sttSupported,
    ttsSupported,
    listening,
    speaking,
    interim,
    startListening,
    stopListening,
    speak,
    cancelSpeak,
  }
}
