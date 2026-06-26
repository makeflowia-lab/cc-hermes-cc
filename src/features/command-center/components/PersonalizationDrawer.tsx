'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Palette } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import { useModalA11y } from '../hooks/useModalA11y'
import { applyAccent } from '../theme'
import { cn } from '@/lib/utils'

const ACCENTS = [
  { name: 'Cian', rgb: '56 189 248' },
  { name: 'Violeta', rgb: '167 139 250' },
  { name: 'Esmeralda', rgb: '52 211 153' },
  { name: 'Ámbar', rgb: '251 191 36' },
  { name: 'Rojo', rgb: '244 63 94' },
  { name: 'Oro', rgb: '234 179 8' },
]

const STYLES = [
  { key: 'political', label: 'Político' },
  { key: 'government', label: 'Gobierno' },
  { key: 'corporate', label: 'Corporativo' },
  { key: 'military', label: 'Militar' },
  { key: 'minimal', label: 'Minimalista' },
]

const FLAGS = ['🇲🇽', '🇨🇴', '🇦🇷', '🇪🇸', '🇨🇱', '🇵🇪', '🇺🇸', '🏛️']

function hexToRgb(hex: string): string | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function PersonalizationDrawer() {
  const { personalizationOpen, setPersonalizationOpen, personalization, setPersonalization } = useCommandCenter()
  const [form, setForm] = useState({
    assistantName: 'Hermes',
    orgName: '',
    accentRgb: '56 189 248',
    country: 'MX',
    countryFlag: '🇲🇽',
    partyLogo: '',
    visualStyle: 'political',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const asideRef = useRef<HTMLElement>(null)
  useModalA11y(personalizationOpen, () => setPersonalizationOpen(false), asideRef)

  useEffect(() => {
    if (personalization) {
      setForm({
        assistantName: personalization.assistantName,
        orgName: personalization.orgName ?? '',
        accentRgb: personalization.accentRgb,
        country: personalization.country,
        countryFlag: personalization.countryFlag ?? '🇲🇽',
        partyLogo: personalization.partyLogo ?? '',
        visualStyle: personalization.visualStyle,
      })
    }
  }, [personalization, personalizationOpen])

  // Vista previa en vivo del acento
  useEffect(() => {
    if (personalizationOpen) applyAccent(form.accentRgb)
  }, [form.accentRgb, personalizationOpen])

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/personalization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('No se pudo guardar')
      const tenant = await res.json()
      setPersonalization(tenant)
      applyAccent(tenant.accentRgb)
      setPersonalizationOpen(false) // solo cierra si tuvo éxito
    } catch {
      setSaveError('No se pudo guardar la personalización. Revisa los datos e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full rounded-lg border border-hairline bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none'

  return (
    <AnimatePresence>
      {personalizationOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPersonalizationOpen(false)}
          />
          <motion.aside
            ref={asideRef}
            role="dialog"
            aria-modal="true"
            aria-label="Personalización del centro de mando"
            className="glass fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto p-6"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
                <Palette className="h-4 w-4 accent" />
                Personalización
              </div>
              <button
                type="button"
                onClick={() => setPersonalizationOpen(false)}
                title="Cerrar"
                aria-label="Cerrar personalización"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Nombre del asistente</span>
                <input
                  className={field}
                  value={form.assistantName}
                  onChange={(e) => setForm({ ...form, assistantName: e.target.value })}
                  placeholder="Hermes, Athena, Atlas…"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Organización / Partido</span>
                <input
                  className={field}
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  placeholder="Nombre de la campaña u organización"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs text-slate-400">Color de acento</span>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.rgb}
                      type="button"
                      onClick={() => setForm({ ...form, accentRgb: a.rgb })}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition',
                        form.accentRgb === a.rgb ? 'border-white' : 'border-transparent',
                      )}
                      style={{ background: `rgb(${a.rgb})` }}
                      title={a.name}
                    />
                  ))}
                  <label
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-hairline text-[9px] text-slate-400"
                    title="Color personalizado"
                  >
                    +
                    <input
                      type="color"
                      className="absolute h-0 w-0 opacity-0"
                      onChange={(e) => {
                        const rgb = hexToRgb(e.target.value)
                        if (rgb) setForm({ ...form, accentRgb: rgb })
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <span className="mb-2 block text-xs text-slate-400">Bandera / símbolo</span>
                <div className="flex flex-wrap gap-2">
                  {FLAGS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, countryFlag: f })}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition',
                        form.countryFlag === f ? 'glass-accent' : 'border-hairline bg-white/[0.02]',
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Logo (URL, opcional)</span>
                <input
                  className={field}
                  value={form.partyLogo}
                  onChange={(e) => setForm({ ...form, partyLogo: e.target.value })}
                  placeholder="https://…/logo.png"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs text-slate-400">Estilo visual</span>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setForm({ ...form, visualStyle: s.key })}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs transition',
                        form.visualStyle === s.key
                          ? 'glass-accent text-white'
                          : 'border-hairline bg-white/[0.02] text-slate-400',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && (
                <p role="alert" className="rounded-lg border border-state-crisis/40 bg-state-crisis/10 px-3 py-2 text-xs text-state-crisis">
                  {saveError}
                </p>
              )}
              <button
                type="button"
                onClick={save}
                disabled={saving}
                aria-busy={saving ? 'true' : 'false'}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white transition disabled:opacity-50"
                style={{ background: 'rgb(var(--hermes-accent) / 0.85)' }}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {saving ? 'Guardando…' : 'Aplicar personalización'}
              </button>
              <p className="text-center text-[11px] text-slate-500">
                Sin tocar código. Cada instalación de Hermes es un producto distinto (DOC 11).
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
