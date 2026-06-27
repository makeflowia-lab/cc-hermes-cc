'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { textOf, type HermesUIMessage } from '../hooks/useHermes'
import { cn } from '@/lib/utils'

interface Props {
  messages: HermesUIMessage[]
  processing: boolean
  assistantName: string
}

export function ConversationStream({ messages, processing, assistantName }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, processing])

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2" role="log" aria-live="polite">
      <AnimatePresence initial={false}>
        {messages.map((m) => {
          const isUser = m.role === 'user'
          const text = textOf(m)
          if (!text) return null
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  isUser
                    ? 'bg-white/[0.06] text-slate-200'
                    : 'glass glass-accent text-slate-100',
                )}
              >
                {!isUser && (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] accent">{assistantName}</span>
                    {!!m.metadata?.councilSize && m.metadata.councilSize > 0 && (
                      <span className="rounded-full border border-state-strategic/30 px-1.5 text-[9px] uppercase tracking-wider text-state-strategic">
                        Consejo: {m.metadata.councilSize} especialistas
                      </span>
                    )}
                    {m.metadata?.usedWeb && (
                      <span className="rounded-full border border-state-normal/40 px-1.5 text-[9px] uppercase tracking-wider text-state-normal">
                        Tiempo real · web
                      </span>
                    )}
                    {m.metadata?.usedSources && (
                      <span className="rounded-full border border-state-info/30 px-1.5 text-[9px] uppercase tracking-wider text-state-info">
                        Fuentes consultadas
                      </span>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {processing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
          <div className="glass glass-accent flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-slate-400">
            <span className="flex gap-1">
              {[0, 0.15, 0.3].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 rounded-full bg-current"
                  style={{ animation: `breathe 1.2s ease-in-out ${d}s infinite` }}
                />
              ))}
            </span>
            El consejo está deliberando…
          </div>
        </motion.div>
      )}
      <div ref={endRef} />
    </div>
  )
}
