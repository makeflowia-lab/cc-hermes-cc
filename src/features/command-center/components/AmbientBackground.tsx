'use client'

import { motion } from 'framer-motion'

/** Fondo holográfico vivo: la interfaz "nunca se siente estática" (DOC 01, Módulo 1). */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 holo-field">
      <div className="absolute inset-0 holo-grid" />
      {/* Halos a la deriva */}
      <motion.div
        className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgb(var(--hermes-accent) / 0.12), transparent 60%)' }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] right-[-5%] h-[34rem] w-[34rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.10), transparent 60%)' }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Partículas tenues */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-px w-px rounded-full bg-sky-300/40"
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
          animate={{ opacity: [0, 0.7, 0], y: [0, -12, 0] }}
          transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}
