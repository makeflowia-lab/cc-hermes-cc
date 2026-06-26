'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useCommandCenter } from '../store/command-center-store'
import { useVoice } from './useVoice'
import { useWakeWord } from './useWakeWord'
import type { HermesMeta, HermesState } from '../types'

export type HermesUIMessage = UIMessage<HermesMeta>

export function textOf(message: { parts?: UIMessage['parts'] }): string {
  if (!message.parts) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function useHermes() {
  const setCouncil = useCommandCenter((s) => s.setCouncil)
  const setConversationId = useCommandCenter((s) => s.setConversationId)
  const setListening = useCommandCenter((s) => s.setListening)
  const setLastTranscript = useCommandCenter((s) => s.setLastTranscript)
  const wakeWordEnabled = useCommandCenter((s) => s.wakeWordEnabled)

  const speakRef = useRef<(t: string) => void>(() => {})
  const askRef = useRef<(t: string) => void>(() => {})

  const transport = useMemo(
    () => new DefaultChatTransport<HermesUIMessage>({ api: '/api/hermes' }),
    [],
  )

  const chat = useChat<HermesUIMessage>({
    transport,
    onFinish: ({ message }) => {
      const meta = message.metadata
      if (meta) {
        setCouncil({
          intent: meta.intent,
          urgency: meta.urgency,
          specialists: meta.specialists,
          model: meta.model,
        })
        if (meta.conversationId) setConversationId(meta.conversationId)
      }
      const text = textOf(message)
      if (useCommandCenter.getState().voiceOutput && text) speakRef.current(text)
    },
  })

  const voice = useVoice({
    onFinalTranscript: (t) => {
      setLastTranscript(t)
      askRef.current(t)
    },
  })
  speakRef.current = voice.speak

  const ask = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      const { mode, conversationId } = useCommandCenter.getState()
      chat.sendMessage({ text }, { body: { mode, conversationId } })
    },
    [chat],
  )
  askRef.current = ask

  const startListening = useCallback(() => {
    voice.cancelSpeak()
    setListening(true)
    voice.startListening()
  }, [voice, setListening])

  const stopListening = useCallback(() => {
    voice.stopListening()
    setListening(false)
  }, [voice, setListening])

  // Voz manos-libres: al oír "Hermes", abre la captura de comando.
  // Se pausa durante TODO el ciclo ocupado (captura, petición en vuelo y TTS) para evitar
  // que el reconocedor de wake word parpadee o escuche la propia voz de Hermes.
  const busyForWake =
    voice.listening || voice.speaking || chat.status === 'submitted' || chat.status === 'streaming'
  useWakeWord({
    enabled: wakeWordEnabled,
    paused: busyForWake,
    onWake: startListening,
  })

  const hermesState: HermesState = voice.listening
    ? 'listening'
    : chat.status === 'streaming'
      ? 'responding'
      : chat.status === 'submitted'
        ? 'processing'
        : 'idle'

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    stop: chat.stop,
    ask,
    hermesState,
    voice,
    startListening,
    stopListening,
  }
}
