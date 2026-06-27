import type { SpecialistKey } from '@/core/types'

/**
 * Regiones del cerebro neuronal ↔ especialistas del Consejo.
 * Compartido por NeuralBrain (colores/asignación), BrainLabels (etiquetas) y BrainCenterpiece
 * (qué región iluminar cuando un especialista se activa → "pides que busque y lo encuentra").
 */
export interface BrainRegion {
  name: string
  sub: string
  color: string // css hex
  hex: number // three hex
  angle: number // grados en el overlay 2D (0 = derecha, positivo hacia abajo)
}

export const BRAIN_REGIONS: BrainRegion[] = [
  { name: 'PREFRONTAL', sub: 'Dirección estratégica', color: '#a78bfa', hex: 0xa78bfa, angle: -90 }, // 0
  { name: 'CÓRTEX ELECTORAL', sub: 'Encuestas · tendencias', color: '#38bdf8', hex: 0x38bdf8, angle: -50 }, // 1
  { name: 'OPINIÓN PÚBLICA', sub: 'Sentimiento · redes', color: '#22d3ee', hex: 0x22d3ee, angle: -12 }, // 2
  { name: 'PROSPECTIVA', sub: 'Escenarios · forecast', color: '#60a5fa', hex: 0x60a5fa, angle: 28 }, // 3
  { name: 'LÓBULO TERRITORIAL', sub: 'Distritos · secciones', color: '#34d399', hex: 0x34d399, angle: 66 }, // 4
  { name: 'HIPOCAMPO', sub: 'Memoria · antecedentes', color: '#4ade80', hex: 0x4ade80, angle: 110 }, // 5
  { name: 'ÁREA DE COMUNICACIÓN', sub: 'Mensaje · discurso', color: '#fbbf24', hex: 0xfbbf24, angle: 150 }, // 6
  { name: 'AMÍGDALA', sub: 'Detección de crisis', color: '#fb7185', hex: 0xfb7185, angle: 196 }, // 7
  { name: 'CÓRTEX JURÍDICO', sub: 'Normativa electoral', color: '#c084fc', hex: 0xc084fc, angle: 236 }, // 8
]

export const SPECIALIST_TO_REGION: Record<SpecialistKey, number> = {
  director_estrategico: 0,
  estratega: 0,
  analista_electoral: 1,
  opinion_publica: 2,
  prospectiva: 3,
  financiero: 3,
  territorial: 4,
  investigador: 5,
  comunicologo: 6,
  speech_writer: 6,
  redactor: 6,
  crisis: 7,
  juridico: 8,
}

export function regionsForSpecialists(specialists: SpecialistKey[] | undefined | null): number[] {
  if (!specialists?.length) return []
  return Array.from(
    new Set(specialists.map((s) => SPECIALIST_TO_REGION[s]).filter((n) => n !== undefined)),
  )
}
