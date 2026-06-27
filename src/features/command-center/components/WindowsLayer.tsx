'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useCommandCenter } from '../store/command-center-store'
import { FloatingWindow, type WinRect } from './FloatingWindow'

/**
 * Capa de ventanas en MOSAICO: se acomodan solas en cuadrícula (tipo "monitores") y se recomponen
 * al abrir/cerrar (DOC Módulo 1: widgets flotantes / pantallas múltiples).
 */
export function WindowsLayer() {
  const windows = useCommandCenter((s) => s.windows)
  const expandedId = useCommandCenter((s) => s.expandedId)
  const setExpandedId = useCommandCenter((s) => s.setExpandedId)
  const [vp, setVp] = useState({ w: 1600, h: 900 })

  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (windows.length === 0) return null

  const n = windows.length
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const gap = 16
  const padTop = 76 // deja libre la barra de controles
  const padBottom = 24
  const padX = 24
  const availW = vp.w - padX * 2
  const availH = vp.h - padTop - padBottom
  const cellW = Math.min(560, (availW - gap * (cols - 1)) / cols)
  const cellH = Math.min(Math.max(220, vp.h * 0.6), (availH - gap * (rows - 1)) / rows)
  const gridH = rows * cellH + gap * (rows - 1)
  const startY = padTop + Math.max(0, (availH - gridH) / 2)

  // Rect de una ventana AMPLIADA (zoom): grande y centrada.
  const expandedRect: WinRect = {
    x: Math.round(vp.w * 0.05),
    y: Math.round(vp.h * 0.06),
    w: Math.round(vp.w * 0.9),
    h: Math.round(vp.h * 0.86),
  }

  const rects: WinRect[] = windows.map((win, i) => {
    if (win.id === expandedId) return expandedRect
    const row = Math.floor(i / cols)
    const col = i % cols
    const itemsInRow = row === rows - 1 ? n - cols * (rows - 1) : cols
    const rowW = itemsInRow * cellW + gap * (itemsInRow - 1)
    const rowStartX = (vp.w - rowW) / 2 // centra cada fila (también la última incompleta)
    const tiled = { x: rowStartX + col * (cellW + gap), y: startY + row * (cellH + gap), w: cellW, h: cellH }
    // Si la ventana fue movida con la mano (pos), conserva su tamaño del mosaico pero usa esa posición.
    return win.pos ? { ...tiled, x: win.pos.x, y: win.pos.y } : tiled
  })

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Telón al ampliar: clic para volver al mosaico */}
      {expandedId && (
        <button
          type="button"
          aria-label="Cerrar vista ampliada"
          onClick={() => setExpandedId(null)}
          className="pointer-events-auto absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
      )}
      <AnimatePresence>
        {windows.map((w, i) => (
          <FloatingWindow key={w.id} win={w} rect={rects[i]} expanded={w.id === expandedId} />
        ))}
      </AnimatePresence>
    </div>
  )
}
