// HERMES — Mapa interactivo. Geocodifica un lugar (Nominatim/OpenStreetMap, sin API key) y devuelve
// una URL embebible de OpenStreetMap con marcador y zoom.

import { z } from 'zod'

export const runtime = 'nodejs'

const QuerySchema = z.object({ q: z.string().min(1).max(200) })

const UA = 'HermesCommandCenter/1.0 (mapa interactivo)'
const FETCH_TIMEOUT_MS = 7000

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  boundingbox: [string, string, string, string] // [minLat, maxLat, minLon, maxLon]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  let args
  try {
    args = QuerySchema.parse({ q: searchParams.get('q') })
  } catch {
    return Response.json({ error: 'Falta el lugar a buscar' }, { status: 400 })
  }

  const ac = new AbortController()
  const to = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(args.q)}&format=json&limit=1&accept-language=es`
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-MX,es;q=0.9' }, signal: ac.signal })
    if (!r.ok) throw new Error(`nominatim ${r.status}`)
    const data = (await r.json()) as NominatimResult[]
    if (!data.length) return Response.json({ found: false, query: args.q })

    const m = data[0]
    const lat = Number(m.lat)
    const lon = Number(m.lon)
    const bb = m.boundingbox.map(Number) // [minLat, maxLat, minLon, maxLon]
    // OSM embed: bbox = minLon,minLat,maxLon,maxLat
    const bbox = `${bb[2]},${bb[0]},${bb[3]},${bb[1]}`
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`
    const linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=13/${lat}/${lon}`
    return Response.json({ found: true, query: args.q, lat, lon, label: m.display_name, embedUrl, linkUrl })
  } catch (e) {
    console.error('[map]', e)
    return Response.json({ found: false, query: args.q, error: 'No se pudo buscar el mapa' }, { status: 502 })
  } finally {
    clearTimeout(to)
  }
}
