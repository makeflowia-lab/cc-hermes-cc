'use client'

import { FormEvent, useState } from 'react'
import { Mic, MicOff, Send, Square } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import { cn } from '@/lib/utils'

interface CommandBarProps {
  onAsk: (text: string) => void
  onStartListening: () => void
  onStopListening: () => void
  onStop: () => void
  listening: boolean
  interim: string
  sttSupported: boolean
  busy: boolean
  minimal?: boolean
}

const SUGGESTIONS = [
  '¿Cómo estamos hoy?',
  '¿Qué debo hacer hoy?',
  'Compárame con el contrincante',
  '¿Qué pasa si cambiamos el mensaje de seguridad?',
]

export function CommandBar({
  onAsk,
  onStartListening,
  onStopListening,
  onStop,
  listening,
  interim,
  sttSupported,
  busy,
  minimal = false,
}: CommandBarProps) {
  const [input, setInput] = useState('')
  const lastTranscript = useCommandCenter((s) => s.lastTranscript)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return // no reenviar mientras Hermes responde (evita peticiones concurrentes)
    const t = input.trim()
    if (!t) return
    setInput('')
    onAsk(t)
  }

  return (
    <div className="w-full">
      {/* Sugerencias (ocultas en modo inmersivo) */}
      {!minimal && (
        <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAsk(s)}
              disabled={busy}
              className="rounded-full border border-hairline bg-white/[0.03] px-3 py-1 text-[11px] text-slate-400 transition hover:bg-white/[0.07] hover:text-slate-200 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={submit}
        className="glass glass-accent flex items-center gap-2 rounded-2xl px-3 py-2 focus-within:ring-1 focus-within:ring-accent/60"
      >
        {/* Micrófono */}
        {sttSupported && (
          <button
            type="button"
            onClick={listening ? onStopListening : onStartListening}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              listening ? 'bg-state-crisis/20 text-state-crisis' : 'bg-white/5 text-slate-300 hover:bg-white/10',
            )}
            title={listening ? 'Detener' : 'Hablar con Hermes'}
            aria-label={listening ? 'Detener dictado de voz' : 'Hablar con Hermes'}
          >
            {listening ? <MicOff className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}

        <input
          value={listening && interim ? interim : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? 'Escuchando…' : busy ? 'Hermes está respondiendo…' : 'Habla o escribe. Pregúntale cualquier cosa a Hermes…'}
          disabled={listening || busy}
          aria-label="Mensaje para Hermes"
          className="flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />

        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Detener"
            aria-label="Detener respuesta"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
            style={{ background: 'rgb(var(--hermes-accent) / 0.85)' }}
            title="Enviar"
            aria-label="Enviar mensaje"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </form>

      {!minimal && lastTranscript && !listening && (
        <p className="mt-1.5 text-center text-[11px] text-slate-500">Último comando de voz: “{lastTranscript}”</p>
      )}
    </div>
  )
}
