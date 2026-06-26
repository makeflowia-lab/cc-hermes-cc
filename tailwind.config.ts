import type { Config } from 'tailwindcss'

/**
 * HERMES COMMAND CENTER — Sistema de Diseño (DOC 05)
 * Base oscura (deep black / navy), neones controlados, alto contraste funcional.
 * El color es SEMÁNTICO, no decorativo: cada tono comunica un estado del sistema.
 * El acento (`accent`) se controla por variable CSS para el white-label (personalización).
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Lienzo: profundidad por capas
        abyss: '#04060d', // fondo más profundo
        void: '#070b16', // fondo base
        panel: '#0c1322', // contenedores
        'panel-2': '#111a2e', // contenedores elevados
        hairline: 'rgba(120, 160, 220, 0.10)', // bordes sutiles

        // Acento personalizable (white-label) — definido por CSS var
        accent: 'rgb(var(--hermes-accent) / <alpha-value>)',

        // Estados semánticos del sistema
        state: {
          normal: '#34d399', // estabilidad
          info: '#38bdf8', // datos neutros
          warning: '#fbbf24', // atención
          crisis: '#f43f5e', // acción inmediata
          strategic: '#a78bfa', // análisis profundo
          tech: '#64748b', // sistema / logs
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--hermes-accent) / 0.25), 0 0 40px -8px rgb(var(--hermes-accent) / 0.35)',
        'glow-strong': '0 0 60px -6px rgb(var(--hermes-accent) / 0.55)',
        panel: '0 20px 60px -24px rgba(0, 0, 0, 0.8)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, rgba(7,11,22,0) 0%, rgba(7,11,22,0.85) 70%, #070b16 100%)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(0, -6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        breathe: 'breathe 5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
        scan: 'scan 6s linear infinite',
        drift: 'drift 7s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
