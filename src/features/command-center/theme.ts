// Aplica el acento white-label en runtime (variable CSS --hermes-accent).
export function applyAccent(rgb: string) {
  if (typeof document === 'undefined') return
  const clean = rgb.trim()
  if (clean) document.documentElement.style.setProperty('--hermes-accent', clean)
}
