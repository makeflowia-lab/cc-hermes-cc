// Provider base de OpenRouter para el cerebro de Hermes Core.
// Convención SaaS Factory (skill `ai`): NUNCA cambiar la firma del provider.

import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    'X-Title': process.env.NEXT_PUBLIC_SITE_NAME ?? 'Hermes Command Center',
  },
})

/**
 * Routing por costo/calidad (skill `cost-optimizer`).
 * El usuario pidió "el mejor modelo": el cerebro estratégico usa Opus 4.1.
 * El Intent Engine usa un modelo rápido y barato para no malgastar Opus en routing.
 */
export const MODELS = {
  fast: 'google/gemini-2.5-flash', // Intent Engine + clasificación estructurada
  balanced: 'anthropic/claude-sonnet-4.5', // conversación estándar / small talk
  powerful: 'anthropic/claude-opus-4.1', // EL MEJOR — síntesis del Consejo Estratégico
  // Salida estructurada (json_schema). Los modelos Anthropic NO la soportan vía OpenRouter,
  // así que para generateObject usamos Gemini Pro como respaldo confiable.
  structured: 'google/gemini-2.5-pro',
  vision: 'google/gemini-2.5-flash', // preparado para Fase 5 (visión)
} as const

export type ModelKey = keyof typeof MODELS
