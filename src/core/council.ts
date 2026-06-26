// HERMES CORE — Consejo Estratégico de IA (EL MAYOR DIFERENCIADOR, DOC 03 §6 / Módulo 5)
//
// "Hermes no tendrá un solo cerebro. Tendrá un Consejo Estratégico de IA.
//  Cada respuesta será el resultado del trabajo coordinado de especialistas.
//  El usuario nunca verá este proceso. Solo recibirá una respuesta integrada."
//
// Fase 1 (DOC 13 §7): NO multi-agente distribuido todavía — routing lógico interno.
// El consejo se materializa como razonamiento estructurado dentro de UNA sola síntesis,
// con la estructura lista para promover cada especialista a microservicio en Fase 4.

import type { SpecialistKey } from './types'

export interface Specialist {
  key: SpecialistKey
  name: string
  role: string
  lens: string // cómo contribuye al razonamiento interno
}

export const COUNCIL: Record<SpecialistKey, Specialist> = {
  director_estrategico: {
    key: 'director_estrategico',
    name: 'Director Estratégico',
    role: 'Coordinador del consejo',
    lens: 'Integra las voces del consejo en una sola recomendación coherente. Prioriza, resuelve contradicciones entre especialistas y decide qué es lo más importante AHORA.',
  },
  analista_electoral: {
    key: 'analista_electoral',
    name: 'Analista Electoral',
    role: 'Encuestas y tendencias',
    lens: 'Lee encuestas, intención de voto, tendencias y comparativos. Distingue señal de ruido. Predice movimientos electorales y su probabilidad.',
  },
  estratega: {
    key: 'estratega',
    name: 'Estratega',
    role: 'Acciones y prioridades',
    lens: 'Convierte el análisis en jugadas concretas. Evalúa escenarios, prioriza acciones por impacto/esfuerzo y define la secuencia óptima.',
  },
  juridico: {
    key: 'juridico',
    name: 'Consultor Jurídico',
    role: 'Normatividad electoral y riesgo legal',
    lens: 'Interpreta normativa electoral, detecta riesgos legales (p. ej. actos anticipados de campaña), límites de gasto y consecuencias regulatorias.',
  },
  opinion_publica: {
    key: 'opinion_publica',
    name: 'Analista de Opinión Pública',
    role: 'Sentimiento y narrativas',
    lens: 'Evalúa sentimiento en redes y medios, narrativas dominantes, alcance e influencers. Detecta hacia dónde se mueve la conversación.',
  },
  investigador: {
    key: 'investigador',
    name: 'Investigador',
    role: 'Antecedentes y contrincantes',
    lens: 'Busca antecedentes, biografía, declaraciones, fortalezas y debilidades del contrincante. Aporta contexto verificable.',
  },
  territorial: {
    key: 'territorial',
    name: 'Analista Territorial',
    role: 'Geografía electoral',
    lens: 'Analiza municipios, distritos y secciones; mapas de calor; historial por zona; dónde se gana o se pierde.',
  },
  comunicologo: {
    key: 'comunicologo',
    name: 'Comunicólogo',
    role: 'Mensaje y tono',
    lens: 'Sugiere el mensaje correcto, el tono y el encuadre. Cómo se dice importa tanto como qué se dice.',
  },
  speech_writer: {
    key: 'speech_writer',
    name: 'Speech Writer',
    role: 'Discursos',
    lens: 'Redacta discursos con fuerza retórica, ritmo y memorabilidad cuando se solicita.',
  },
  redactor: {
    key: 'redactor',
    name: 'Redactor',
    role: 'Comunicados',
    lens: 'Genera comunicados y textos oficiales claros, precisos y listos para publicar.',
  },
  financiero: {
    key: 'financiero',
    name: 'Analista Financiero',
    role: 'Presupuestos',
    lens: 'Evalúa presupuestos, costo de las acciones y retorno esperado de la inversión política.',
  },
  crisis: {
    key: 'crisis',
    name: 'Detección de Crisis',
    role: 'Riesgos y alertas',
    lens: 'Detecta anomalías, ataques y rumores emergentes; evalúa impacto y urgencia; activa protocolo de crisis cuando corresponde.',
  },
  prospectiva: {
    key: 'prospectiva',
    name: 'Prospectiva / Forecasting',
    role: 'Predicción y simulación',
    lens: 'Modela escenarios futuros y "¿qué pasa si…?". Estima impacto y probabilidad de cada decisión antes de tomarla.',
  },
}

export const ALL_SPECIALISTS = Object.keys(COUNCIL) as SpecialistKey[]

/** Construye la sección del consejo para el system prompt, según especialistas activados. */
export function buildCouncilBriefing(active: SpecialistKey[]): string {
  const unique = Array.from(new Set<SpecialistKey>(['director_estrategico', ...active]))
  const lines = unique
    .map((k) => COUNCIL[k])
    .filter(Boolean)
    .map((s) => `- **${s.name}** (${s.role}): ${s.lens}`)
    .join('\n')

  return `Para esta respuesta, sesiona internamente con estos miembros de tu Consejo Estratégico y FUSIONA sus voces en una sola respuesta integrada (el usuario NUNCA ve el proceso interno):\n${lines}`
}
