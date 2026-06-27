// HERMES — Búsqueda de MEDIA (imágenes / videos) para abrir en ventanas emergentes.
// Sin API keys: imágenes vía Bing (resultados tipo Google), videos vía YouTube. Scraping best-effort.

import { z } from 'zod'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  type: z.enum(['image', 'video']),
  q: z.string().min(1).max(200),
})

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.5' }
const FETCH_TIMEOUT_MS = 7000
const MAX_HTML = 3_000_000 // tope para no buferear páginas enormes

/** fetch del HTML upstream con timeout (AbortController) + verificación de estado + tope de tamaño. */
async function fetchHtml(url: string): Promise<string> {
  const ac = new AbortController()
  const to = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
  try {
    const r = await fetch(url, { headers: HEADERS, signal: ac.signal })
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    const html = await r.text()
    return html.length > MAX_HTML ? html.slice(0, MAX_HTML) : html
  } finally {
    clearTimeout(to)
  }
}

/** Videos: extrae los primeros videoId de la página de resultados de YouTube. */
async function searchYouTube(q: string): Promise<{ id: string }[]> {
  const html = await fetchHtml(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=es`)
  const ids: string[] = []
  const seen = new Set<string>()
  const re = /"videoId":"([0-9A-Za-z_-]{11})"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && ids.length < 8) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      ids.push(m[1])
    }
  }
  return ids.map((id) => ({ id }))
}

/** Imágenes: extrae las URLs reales (murl) de los resultados de Bing Images. */
async function searchBingImages(q: string): Promise<{ url: string }[]> {
  const html = await fetchHtml(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1`)
  const urls: string[] = []
  const seen = new Set<string>()
  // Bing guarda la URL en murl (HTML-escapado con &quot;). Capturamos perezoso hasta el cierre &quot;
  // (las URLs llevan &amp; en sus query strings; cortar en el primer & truncaría la imagen).
  const patterns = [/murl&quot;:&quot;(https?:\/\/.+?)&quot;/g, /"murl":"(https?:\/\/[^"]+?)"/g]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) && urls.length < 12) {
      const u = m[1]
        .replace(/\\u002f/gi, '/')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')
      if (/^https?:\/\//i.test(u) && !seen.has(u)) {
        seen.add(u)
        urls.push(u)
      }
    }
    if (urls.length) break
  }
  return urls.slice(0, 8).map((u) => ({ url: u }))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  let args
  try {
    args = QuerySchema.parse({ type: searchParams.get('type'), q: searchParams.get('q') })
  } catch {
    return Response.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }
  try {
    const items = args.type === 'video' ? await searchYouTube(args.q) : await searchBingImages(args.q)
    return Response.json({ type: args.type, query: args.q, items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[media]', args.type, e)
    // Falla elegante: el cliente muestra "no encontré resultados".
    return Response.json({ type: args.type, query: args.q, items: [] })
  }
}
