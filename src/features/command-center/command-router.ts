import type { Mode } from './types'

/**
 * Enrutador de comandos de UI: "el usuario llama las secciones a través de Hermes".
 * Si el texto es un comando de navegación (mostrar/ocultar secciones, cambiar modo) lo resolvemos
 * al instante (sin LLM) y Hermes lo confirma por voz. Si no, es una consulta normal al cerebro.
 */
export type UiCommand =
  | { kind: 'datos' }
  | { kind: 'informe' }
  | { kind: 'personaliza' }
  | { kind: 'tablero' }
  | { kind: 'completo' }
  | { kind: 'ocultar' }
  | { kind: 'cerrar_ventanas' }
  | { kind: 'mode'; mode: Mode }

export interface RoutedCommand {
  cmd: UiCommand
  ack: string
}

export function interpretUiCommand(text: string): RoutedCommand | null {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // sin acentos para robustez
  const has = (...ws: string[]) => ws.some((w) => t.includes(w))
  const reveal = has('muestra', 'muestrame', 'abre', 'abreme', 'abrir', 'ver el', 'ver los', 'ver las', 'despliega', 'ensename', 'saca', 'pon el', 'pon los', 'dame el', 'dame los')

  // Cerrar ventanas flotantes
  if (has('cierra las ventanas', 'cierra ventanas', 'limpia ventanas', 'cierra la ventana', 'quita las ventanas', 'borra las ventanas'))
    return { cmd: { kind: 'cerrar_ventanas' }, ack: 'Cerré las ventanas.' }

  // Ocultar / despejar → solo el cerebro
  if (has('oculta', 'ocultar', 'limpia', 'limpiar', 'cierra todo', 'despeja', 'solo el cerebro', 'modo limpio', 'modo inmersivo'))
    return { cmd: { kind: 'ocultar' }, ack: 'Listo. Pantalla despejada.' }

  // Modos
  if (has('war room', 'sala de guerra')) return { cmd: { kind: 'mode', mode: 'war_room' }, ack: 'Activando modo War Room.' }
  if (has('modo crisis')) return { cmd: { kind: 'mode', mode: 'crisis' }, ack: 'Activando modo crisis.' }
  if (has('modo presentacion')) return { cmd: { kind: 'mode', mode: 'presentation' }, ack: 'Modo presentación.' }

  // Tablero completo
  if (has('tablero completo', 'modo completo', 'pantalla completa', 'panel completo'))
    return { cmd: { kind: 'completo' }, ack: 'Abriendo el tablero completo.' }

  // Informe / Copiloto
  if (has('informe', 'que debo hacer hoy', 'resumen del dia', 'copiloto', 'briefing'))
    return { cmd: { kind: 'informe' }, ack: 'Aquí está tu informe del día.' }

  // Centro de Datos
  if (has('centro de datos', 'documentos', 'base de conocimiento') || (has('sube', 'subir', 'cargar', 'indexa') && has('documento', 'pdf', 'archivo', 'word', 'excel')))
    return { cmd: { kind: 'datos' }, ack: 'Abriendo el Centro de Datos.' }

  // Personalización
  if (has('personaliza', 'personalizacion', 'configura', 'configuracion', 'ajustes', 'cambia la marca', 'cambia el color', 'cambia la bandera'))
    return { cmd: { kind: 'personaliza' }, ack: 'Abriendo personalización.' }

  // Tablero (consejo + monitores) como overlay — requiere verbo de mostrar para no secuestrar preguntas
  if (reveal && has('tablero', 'monitores', 'consejo', 'paneles', 'dashboard', 'panel'))
    return { cmd: { kind: 'tablero' }, ack: 'Mostrando el tablero.' }

  return null
}

/**
 * Decisión de PRESENTACIÓN: Hermes decide cuándo abrir una ventana emergente y cuándo solo hablar.
 * - Preguntas del sistema / estrategia / charla → 'none' (solo voz, SIN ventana).
 * - Pedidos de internet con media (foto/video) → 'image' | 'video' (ventana con media).
 * - Pedidos explícitos de "muéstrame / abre una ventana" (info de texto) → 'text' (ventana con la respuesta).
 * Regla del usuario: "si te pido algo de internet que merece mostrar video o foto, abre una ventana;
 * si te pido algo de los sistemas, solo menciónalo".
 */
export type DisplayDecision =
  | { kind: 'none' }
  | { kind: 'text' }
  | { kind: 'image'; query: string }
  | { kind: 'video'; query: string }

const RE_VIDEO = /\b(videos?|v[ií]deos?|clips?|youtube|reproduce|reprod[uú]celo|p[oó]n(?:me)?\s+(?:un|el)\s+v[ií]deo)\b/i
const RE_IMAGE = /\b(im[aá]genes?|im[aá]gen|fotos?|foto|fotograf[ií]as?)\b/i
const RE_SHOW = /\b(mu[eé]strame|mu[eé]strales?|mu[eé]stralo|mu[eé]strala|ens[eé][ñn]ame|abre(?:\s+una)?\s+ventana|ponme\s+en\s+pantalla|p[oó]n\s+en\s+pantalla|visual[ií]za|despli[eé]ga|en\s+una\s+ventana)\b/i

/** Limpia el texto para usarlo como búsqueda de media (quita verbos de mostrar y la palabra foto/video). */
function mediaQuery(text: string): string {
  let q = text.replace(/^\s*(oye|hey|ok)?\s*hermes[,\s]*/i, '')
  q = q.replace(
    /\b(mu[eé]strame|mu[eé]strales?|ens[eé][ñn]ame|ponme|p[oó]n|abre(?:\s+una)?\s+ventana(?:\s+con)?|busca(?:r)?(?:\s+en)?(?:\s+internet|\s+la\s+web|\s+google|\s+youtube)?|quiero\s+ver|qu[ieé]ro|reproduce|reprod[uú]celo|visual[ií]za|despli[eé]ga|saca|tr[aá]eme|dame)\b/gi,
    ' ',
  )
  q = q.replace(/\b(im[aá]genes?|im[aá]gen|fotos?|foto|fotograf[ií]as?|videos?|v[ií]deos?|v[ií]deo|clips?|youtube|google)\b\s*(?:de|del|sobre|acerca\s+de)?/gi, ' ')
  q = q.replace(/\b(una|un|unas|unos|por\s+favor|porfa|me)\b/gi, ' ')
  return q.replace(/\s+/g, ' ').trim()
}

export function decideDisplay(text: string): DisplayDecision {
  const t = text.trim()
  if (!t) return { kind: 'none' }
  // Media gana sobre "muéstrame" (p.ej. "muéstrame fotos de X" → imagen).
  if (RE_VIDEO.test(t)) return { kind: 'video', query: mediaQuery(t) || t }
  if (RE_IMAGE.test(t)) return { kind: 'image', query: mediaQuery(t) || t }
  if (RE_SHOW.test(t)) return { kind: 'text' }
  return { kind: 'none' }
}
