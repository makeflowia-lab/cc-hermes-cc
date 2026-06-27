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

// Pistas de género por nombre de voz del SO (las voces no exponen género de forma estándar).
const MALE_HINTS = ['jorge', 'raul', 'raúl', 'pablo', 'diego', 'miguel', 'juan', 'carlos', 'alvaro', 'álvaro', 'male', 'hombre', 'masc']
const FEMALE_HINTS = ['sabina', 'dalia', 'paulina', 'helena', 'laura', 'female', 'mujer', 'femen']

/** Elige la mejor voz disponible: prioriza HOMBRE en es-MX, luego es-*, evitando voces femeninas. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const wanted = lang.toLowerCase()
  const esMx = voices.filter((v) => v.lang?.toLowerCase().startsWith(wanted) || v.lang?.toLowerCase().startsWith('es-mx'))
  const es = voices.filter((v) => v.lang?.toLowerCase().startsWith('es'))
  const isMale = (v: SpeechSynthesisVoice) => MALE_HINTS.some((h) => v.name.toLowerCase().includes(h))
  const notFemale = (v: SpeechSynthesisVoice) => !FEMALE_HINTS.some((h) => v.name.toLowerCase().includes(h))
  return (
    esMx.find(isMale) ??
    es.find(isMale) ??
    esMx.find(notFemale) ??
    es.find(notFemale) ??
    esMx[0] ??
    es[0] ??
    null
  )
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
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null) // reproductor de la voz neuronal (ElevenLabs)
  const cloudDownRef = useRef(false) // si el TTS en la nube falla, deja de intentarlo en la sesión

  useEffect(() => {
    setSttSupported(!!getRecognitionCtor())
    setTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    // Las voces del SO cargan async: cachéalas y refresca al cambiar.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        voicesRef.current = window.speechSynthesis.getVoices()
      }
      load()
      window.speechSynthesis.onvoiceschanged = load
      return () => {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
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
    // Cancela TTS para no escucharse a sí mismo (voz natural + navegador).
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch {
        /* noop */
      }
    }

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

  // Voz del NAVEGADOR (fallback): speechSynthesis.
  const speakBrowser = useCallback(
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
      // Ligeramente más lento y grave = más natural y masculino.
      utt.rate = 0.97
      utt.pitch = 0.92
      const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices()
      const voice = pickVoice(voices, lang)
      if (voice) utt.voice = voice
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

  // Voz NATURAL (ElevenLabs vía /api/tts) con fallback a la del navegador.
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      const plain = plainForSpeech(text)
      if (!plain) {
        onEnd?.()
        return
      }
      if (cloudDownRef.current || typeof window === 'undefined') {
        speakBrowser(text, onEnd)
        return
      }
      // Corta cualquier audio/voz previa.
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* noop */
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause()
        } catch {
          /* noop */
        }
      }
      setSpeaking(true)
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plain }),
      })
        .then(async (r) => {
          // Solo 501 (sin key configurada) apaga la voz neuronal de forma permanente.
          // Cualquier otro fallo (502/400/cuota/red) NO se "engancha": la próxima frase reintenta Brian.
          if (r.status === 501) {
            cloudDownRef.current = true
            speakBrowser(text, onEnd)
            return
          }
          if (!r.ok) {
            speakBrowser(text, onEnd)
            return
          }
          const blob = await r.blob()
          const url = URL.createObjectURL(blob)
          let a = audioRef.current
          if (!a) {
            a = new Audio()
            audioRef.current = a
          }
          a.src = url
          let done = false
          const finish = () => {
            if (done) return
            done = true
            setSpeaking(false)
            URL.revokeObjectURL(url)
            onEnd?.()
          }
          a.onended = finish
          a.onerror = finish
          a.play().catch(() => {
            // Autoplay bloqueado → usa la voz del navegador (que se desbloquea con el gesto).
            URL.revokeObjectURL(url)
            speakBrowser(text, onEnd)
          })
        })
        .catch(() => {
          // Error de red puntual → reintenta en la próxima frase (sin enganchar).
          speakBrowser(text, onEnd)
        })
    },
    [speakBrowser],
  )

  const cancelSpeak = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch {
        /* noop */
      }
    }
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
      // Desbloquea también el reproductor de la voz neuronal (ElevenLabs) con un clip silencioso.
      try {
        if (!audioRef.current) audioRef.current = new Audio()
        audioRef.current.src =
          'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
        audioRef.current.play().catch(() => {})
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
      if (audioRef.current) {
        try {
          audioRef.current.pause()
        } catch {
          /* noop */
        }
      }
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
