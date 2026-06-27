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
