'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useCommandCenter } from '../store/command-center-store'
import { useVoice } from './useVoice'
import { useWakeWord } from './useWakeWord'
import { useClapDetection } from './useClapDetection'
import { interpretUiCommand } from '../command-router'
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
  const clapEnabled = useCommandCenter((s) => s.clapEnabled)

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

  // Ilumina las regiones/especialistas EN CUANTO llega la metadata (al iniciar el stream),
  // no al terminar — así el cerebro reacciona mientras "busca", no después.
  const lastMessage = chat.messages[chat.messages.length - 1]
  const streamingMeta =
    lastMessage?.role === 'assistant' ? (lastMessage.metadata as HermesMeta | undefined) : undefined
  const specialistsKey = streamingMeta?.specialists?.join(',') ?? ''
  const convKey = streamingMeta?.conversationId ?? ''
  useEffect(() => {
    if (!streamingMeta) return
    setCouncil({
      intent: streamingMeta.intent,
      urgency: streamingMeta.urgency,
      specialists: streamingMeta.specialists,
      model: streamingMeta.model,
    })
    if (streamingMeta.conversationId) setConversationId(streamingMeta.conversationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialistsKey, convKey, setCouncil, setConversationId])

  const ask = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      const s = useCommandCenter.getState()

      // ¿Es un comando para invocar/ocultar secciones? Se resuelve al instante (sin LLM).
      const routed = interpretUiCommand(t)
      if (routed) {
        switch (routed.cmd.kind) {
          case 'datos':
            s.setKnowledgeOpen(true)
            break
          case 'informe':
            s.setBriefingOpen(true)
            break
          case 'personaliza':
            s.setPersonalizationOpen(true)
            break
          case 'tablero':
            s.setDashboardOpen(true)
            break
          case 'completo':
            s.setImmersive(false)
            break
          case 'ocultar':
            s.setKnowledgeOpen(false)
            s.setPersonalizationOpen(false)
            s.setBriefingOpen(false)
            s.setDashboardOpen(false)
            s.setImmersive(true)
            break
          case 'mode':
            s.setMode(routed.cmd.mode)
            s.setImmersive(false)
            break
        }
        if (s.voiceOutput) speakRef.current(routed.ack)
        return
      }

      s.setGreeting('') // el saludo cede ante la conversación real
      chat.sendMessage({ text }, { body: { mode: s.mode, conversationId: s.conversationId } })
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

  // Ignición: "se inicia con 2 aplausos" (o clic). Despierta, SALUDA según la hora y escucha.
  const activate = useCallback(() => {
    const s = useCommandCenter.getState()
    const wasAwake = s.awake
    s.setAwake(true)
    if (!wasAwake) {
      const h = new Date().getHours()
      const saludo = h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches'
      const greeting = `${saludo}. ¿En qué podemos ayudarte?`
      s.setGreeting(greeting)
      if (s.voiceOutput) speakRef.current(greeting)
    }
    if (!voice.listening) startListening()
  }, [voice.listening, startListening])
  const activateRef = useRef(activate)
  activateRef.current = activate

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

  // Activación por DOBLE APLAUSO → ignición (despierta, saluda y escucha).
  useClapDetection({
    enabled: clapEnabled,
    onDoubleClap: () => activateRef.current(),
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
    activate,
    hermesState,
    voice,
    startListening,
    stopListening,
  }
}
