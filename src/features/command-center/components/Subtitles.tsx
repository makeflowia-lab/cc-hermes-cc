'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { textOf, type HermesUIMessage } from '../hooks/useHermes'

/**
 * Subtítulos del modo inmersivo: lo que el usuario dice (interim) y la respuesta de Hermes,
 * como en un centro de mando ("voz primero"). Sin paneles: solo conversación sobre el cerebro.
 */
export function Subtitles({
  messages,
  interim,
  listening,
  assistantName,
  fallback = '',
}: {
  messages: HermesUIMessage[]
  interim: string
  listening: boolean
  assistantName: string
  fallback?: string
}) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  let hermesText = lastAssistant ? textOf(lastAssistant) : fallback
  if (hermesText.length > 320) hermesText = '… ' + hermesText.slice(-320)
  const userLine = listening && interim ? interim : ''

  return (
    <div className="pointer-events-none min-h-[2.5rem] w-full max-w-3xl text-center" aria-live="polite">
      <AnimatePresence mode="wait">
        {userLine && (
          <motion.p
            key="user"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-slate-400"
          >
            “{userLine}”
          </motion.p>
        )}
      </AnimatePresence>
      {!userLine && hermesText && (
        <p className="mx-auto max-w-2xl text-balance text-sm leading-relaxed text-slate-200 sm:text-base">
          <span className="accent">{assistantName}: </span>
          {hermesText}
        </p>
      )}
    </div>
  )
}
