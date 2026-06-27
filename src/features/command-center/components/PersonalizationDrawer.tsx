'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Palette, ImagePlus, Trash2 } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import { listCameras } from '../camera'
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

// Variantes de diseño del cerebro (paletas en NeuralBrain).
const BRAIN_VARIANTS = [
  { key: 'aurora', label: 'Aurora', dot: '#a78bfa' },
  { key: 'jarvis', label: 'Jarvis (cian)', dot: '#22d3ee' },
  { key: 'plasma', label: 'Plasma', dot: '#d946ef' },
  { key: 'matrix', label: 'Matrix', dot: '#22c55e' },
  { key: 'gold', label: 'Oro', dot: '#fbbf24' },
]

const FLAGS = ['🇲🇽', '🇨🇴', '🇦🇷', '🇪🇸', '🇨🇱', '🇵🇪', '🇺🇸', '🏛️']

function hexToRgb(hex: string): string | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

// Lee una imagen y la reescala (máx 1920px, JPEG q0.85) → data URI ligero para guardar en el tenant.
function fileToScaledDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.onload = () => {
        const max = 1920
        let { width, height } = img
        if (width > max || height > max) {
          const s = max / Math.max(width, height)
          width = Math.round(width * s)
          height = Math.round(height * s)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no disponible'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function PersonalizationDrawer() {
  const { personalizationOpen, setPersonalizationOpen, personalization, setPersonalization, operatorName, setOperatorName, cameraId, setCameraId, controls, setControl } = useCommandCenter()
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const CONTROL_LABELS: { key: 'clap' | 'gesture' | 'face' | 'voice' | 'settings'; label: string }[] = [
    { key: 'clap', label: 'Aplausos (mano)' },
    { key: 'gesture', label: 'Gestos (cámara)' },
    { key: 'face', label: 'Rostro' },
    { key: 'voice', label: 'Voz' },
    { key: 'settings', label: 'Configuración' },
  ]
  const [form, setForm] = useState({
    assistantName: 'Hermes',
    orgName: '',
    accentRgb: '56 189 248',
    country: 'MX',
    countryFlag: '🇲🇽',
    partyLogo: '',
    backgroundImage: '',
    brainVariant: 'aurora',
    visualStyle: 'political',
  })
  const [saving, setSaving] = useState(false)
  const [bgError, setBgError] = useState<string | null>(null)
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
        backgroundImage: personalization.backgroundImage ?? '',
        brainVariant: personalization.brainVariant ?? 'aurora',
        visualStyle: personalization.visualStyle,
      })
    }
  }, [personalization, personalizationOpen])

  // Vista previa en vivo del acento
  useEffect(() => {
    if (personalizationOpen) applyAccent(form.accentRgb)
  }, [form.accentRgb, personalizationOpen])

  // Lista de cámaras (para elegir la USB en vez de la integrada). Etiquetas tras conceder permiso.
  useEffect(() => {
    if (personalizationOpen) listCameras().then(setCameras)
  }, [personalizationOpen])

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
                <span className="mb-1 block text-xs text-slate-400">Tu nombre (para que te salude)</span>
                <input
                  className={field}
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value.slice(0, 30))}
                  maxLength={30}
                  placeholder="Ej. Ricardo"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Cámara (gestos y rostro)</span>
                <select
                  className={field}
                  style={{ colorScheme: 'dark' }}
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                >
                  <option value="" className="bg-slate-900 text-slate-100">
                    Predeterminada del navegador
                  </option>
                  {cameras.map((c, i) => (
                    <option key={c.deviceId || i} value={c.deviceId} className="bg-slate-900 text-slate-100">
                      {c.label || `Cámara ${i + 1}`}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[10px] text-slate-500">
                  Si los nombres salen vacíos, enciende gestos/rostro una vez para conceder permiso y vuelve a abrir.
                </span>
              </label>

              <div>
                <span className="mb-2 block text-xs text-slate-400">Iconos de control visibles</span>
                <div className="flex flex-wrap gap-2">
                  {CONTROL_LABELS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setControl(c.key, !controls[c.key])}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs transition',
                        controls[c.key] ? 'glass-accent text-white' : 'border-hairline bg-white/[0.02] text-slate-500',
                      )}
                    >
                      {controls[c.key] ? '✓ ' : ''}
                      {c.label}
                    </button>
                  ))}
                </div>
                <span className="mt-1 block text-[10px] text-slate-500">
                  Aunque ocultes "Configuración", puedes reabrir esto diciendo "abre configuración".
                </span>
              </div>

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

              {/* Imagen de fondo: cualquier foto/logo/imagen, a pantalla completa, con el cerebro delante. */}
              <div>
                <span className="mb-2 block text-xs text-slate-400">Imagen de fondo (el cerebro va delante)</span>
                {form.backgroundImage ? (
                  <div className="space-y-2">
                    <div className="relative overflow-hidden rounded-lg border border-hairline">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.backgroundImage} alt="Vista previa del fondo" className="h-28 w-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-hairline bg-white/[0.03] py-2 text-xs text-slate-300 transition hover:bg-white/10">
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        Cambiar
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            setBgError(null)
                            try {
                              setForm((prev) => ({ ...prev, backgroundImage: '' }))
                              const uri = await fileToScaledDataUri(f)
                              setForm((prev) => ({ ...prev, backgroundImage: uri }))
                            } catch {
                              setBgError('No se pudo procesar la imagen.')
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, backgroundImage: '' })}
                        className="flex items-center justify-center gap-2 rounded-lg border border-hairline bg-white/[0.03] px-3 py-2 text-xs text-slate-400 transition hover:bg-white/10 hover:text-state-crisis"
                        title="Quitar fondo"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline bg-white/[0.02] py-6 text-xs text-slate-400 transition hover:bg-white/[0.05]">
                    <ImagePlus className="h-5 w-5 accent" aria-hidden="true" />
                    Sube una foto, logo o imagen
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        setBgError(null)
                        try {
                          const uri = await fileToScaledDataUri(f)
                          setForm((prev) => ({ ...prev, backgroundImage: uri }))
                        } catch {
                          setBgError('No se pudo procesar la imagen.')
                        }
                      }}
                    />
                  </label>
                )}
                {bgError && <p className="mt-1 text-[11px] text-state-crisis">{bgError}</p>}
              </div>

              <div>
                <span className="mb-2 block text-xs text-slate-400">Diseño del cerebro</span>
                <div className="flex flex-wrap gap-2">
                  {BRAIN_VARIANTS.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setForm({ ...form, brainVariant: b.key })}
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition',
                        form.brainVariant === b.key
                          ? 'glass-accent text-white'
                          : 'border-hairline bg-white/[0.02] text-slate-400',
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.dot }} />
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

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
