// HERMES — Voz natural (TTS) con ElevenLabs.
// El cliente (useVoice) llama aquí; si no hay API key o falla, cae a la voz del navegador.

import { z } from 'zod'

export const runtime = 'nodejs'

const BodySchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().max(64).optional(),
})

// eleven_multilingual_v2 maneja muy bien el español. Voz por defecto: ELEVENLABS_VOICE_ID.
// "Brian" (premade, grave/varonil) funciona en plan gratis; las voces de librería (p.ej. Karim MX) requieren plan de pago.
const MODEL_ID = 'eleven_multilingual_v2'
const DEFAULT_VOICE = 'nPczCjzI2devNBz1zQrb' // "Brian" (hombre, grave) — premade (plan gratis)

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) {
    // Sin key configurada → el cliente usará la voz del navegador.
    return Response.json({ error: 'TTS no configurado' }, { status: 501 })
  }

  let body
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Texto inválido' }, { status: 400 })
  }

  const voiceId = body.voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: body.text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    })
    if (!r.ok || !r.body) {
      const detail = await r.text().catch(() => '')
      console.error('[tts][elevenlabs]', r.status, detail.slice(0, 300))
      return Response.json({ error: 'TTS falló' }, { status: 502 })
    }
    return new Response(r.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[tts]', e)
    return Response.json({ error: 'TTS error' }, { status: 502 })
  }
}
