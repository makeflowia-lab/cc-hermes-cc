'use client'

import { RefObject, useEffect, useRef } from 'react'

/**
 * Accesibilidad para diálogos/drawers: Escape para cerrar, foco inicial dentro del contenedor,
 * trampa de foco (Tab cíclico) y restauración del foco al cerrar.
 */
export function useModalA11y(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>,
) {
  // onClose suele venir como función nueva en cada render; usar un ref evita que el efecto
  // se reejecute (y robe el foco al primer control) cada vez que el usuario teclea.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = (): HTMLElement[] => {
      const c = ref.current
      if (!c) return []
      return Array.from(
        c.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null)
    }

    // Mueve el foco al primer control del diálogo.
    const t = setTimeout(() => focusables()[0]?.focus(), 30)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const items = focusables()
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
    // Solo depende de `open`: el foco inicial se coloca una vez al abrir, no en cada tecla.
  }, [open, ref])
}
