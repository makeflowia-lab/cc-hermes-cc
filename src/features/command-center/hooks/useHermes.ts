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

// Palabra para SALIR del modo escucha continua → vuelve a standby (activar con 2 aplausos).
function isStopWord(text: string): boolean {
  const n = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim()
  const tokens = n.split(/\s+/).filter(Boolean)
  if (tokens.length === 0 || tokens.length > 3) return false
  return tokens.some((w) => ['ok', 'okay', 'okey', 'oka', 'listo'].includes(w))
}

export function useHermes() {
  const setCouncil = useCommandCenter((s) => s.setCouncil)
  const setConversationId = useCommandCenter((s) => s.setConversationId)
  const setListening = useCommandCenter((s) => s.setListening)
  const setLastTranscript = useCommandCenter((s) => s.setLastTranscript)
  const wakeWordEnabled = useCommandCenter((s) => s.wakeWordEnabled)
  const clapEnabled = useCommandCenter((s) => s.clapEnabled)

  const speakRef = useRef<(t: string, onEnd?: () => void) => void>(() => {})
  const askRef = useRef<(t: string) => void>(() => {})
  const resumeRef = useRef<() => void>(() => {})
  const deactivateRef = useRef<() => void>(() => {})
  const currentWindowIdRef = useRef<string | null>(null)

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
      // Vuelca la respuesta final en su ventana flotante.
      const id = currentWindowIdRef.current
      if (id) {
        useCommandCenter.getState().updateWindow(id, {
          content: text,
          loading: false,
          web: meta?.usedWeb,
          sources: meta?.usedSources,
        })
        currentWindowIdRef.current = null
      }
      // Tras responder: si la voz está activa, habla y AL TERMINAR vuelve a escuchar (bucle continuo).
      if (useCommandCenter.getState().voiceOutput && text) speakRef.current(text, () => resumeRef.current())
      else resumeRef.current()
    },
  })

  const voice = useVoice({
    onFinalTranscript: (t) => {
      setLastTranscript(t)
      // "ok" → salir del modo escucha; cualquier otra cosa → procesar.
      if (isStopWord(t)) {
        deactivateRef.current()
        return
      }
      askRef.current(t)
    },
    onListenEnd: (hadSpeech) => {
      // Silencio en modo activo → reabre el micrófono (escucha continua hasta decir "ok").
      if (!hadSpeech) resumeRef.current()
    },
  })
  speakRef.current = voice.speak

  // Ilumina las regiones/especialistas EN CUANTO llega la metadata (al iniciar el stream),
  // no al terminar — así el cerebro reacciona mientras "busca", no después.
  const lastMessage = chat.messages[chat.messages.length - 1]
  const streamingMeta =
    lastMessage?.role === 'assistant' ? (lastMessage.metadata as HermesMeta | undefined) : undefined
  // Transmite el texto en streaming a la ventana flotante activa (se va llenando en vivo).
  const lastAssistantText = lastMessage?.role === 'assistant' ? textOf(lastMessage) : ''
  useEffect(() => {
    const id = currentWindowIdRef.current
    if (id && lastAssistantText) {
      useCommandCenter.getState().updateWindow(id, { content: lastAssistantText, loading: false })
    }
  }, [lastAssistantText])

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
            s.clearWindows()
            s.setImmersive(true)
            break
          case 'cerrar_ventanas':
            s.clearWindows()
            break
          case 'mode':
            s.setMode(routed.cmd.mode)
            s.setImmersive(false)
            break
        }
        if (s.voiceOutput) speakRef.current(routed.ack, () => resumeRef.current())
        else resumeRef.current()
        return
      }

      s.setGreeting('') // el saludo cede ante la conversación real
      // Abre una VENTANA FLOTANTE para esta consulta; la respuesta se transmite ahí (varias a la vez).
      const winId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w-${Date.now()}`
      s.addWindow({ id: winId, title: t.length > 64 ? `${t.slice(0, 64)}…` : t, content: '', loading: true })
      currentWindowIdRef.current = winId
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

  // Reabre el micrófono si seguimos en sesión (modo escucha continua), tras responder o tras silencio.
  const resumeListen = useCallback(() => {
    setTimeout(() => {
      const st = useCommandCenter.getState()
      if (st.awake && !st.listening) startListening()
    }, 350)
  }, [startListening])
  resumeRef.current = resumeListen

  // "ok" → cancela el modo escucha y vuelve a standby (activar con 2 aplausos).
  const deactivate = useCallback(() => {
    const s = useCommandCenter.getState()
    s.setAwake(false)
    s.setGreeting('')
    stopListening()
    if (s.voiceOutput) speakRef.current('Hasta pronto.')
  }, [stopListening])
  deactivateRef.current = deactivate

  // Ignición: "se inicia con 2 aplausos" (o clic). Despierta, SALUDA según la hora y LUEGO escucha.
  const activate = useCallback(() => {
    const s = useCommandCenter.getState()
    const wasAwake = s.awake
    s.setAwake(true)
    if (!wasAwake && s.voiceOutput) {
      const h = new Date().getHours()
      const saludo = h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches'
      const greeting = `${saludo}. ¿En qué podemos ayudarte?`
      s.setGreeting(greeting)
      // Saluda y SOLO al terminar empieza a escuchar (startListening cancelaría el saludo si fuera antes).
      speakRef.current(greeting, () => startListening())
      return
    }
    if (!wasAwake) {
      const h = new Date().getHours()
      const saludo = h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches'
      s.setGreeting(`${saludo}. ¿En qué podemos ayudarte?`)
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
    deactivate,
    hermesState,
    voice,
    startListening,
    stopListening,
  }
}
