'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Database, Upload, Trash2, Plus, FileText } from 'lucide-react'
import { useCommandCenter } from '../store/command-center-store'
import { useModalA11y } from '../hooks/useModalA11y'
import { cn } from '@/lib/utils'

interface DocItem {
  title: string
  source: string | null
  chunks: number
}

export function KnowledgeDrawer() {
  const { knowledgeOpen, setKnowledgeOpen, setKnowledgeCount } = useCommandCenter()
  const asideRef = useRef<HTMLElement>(null)
  useModalA11y(knowledgeOpen, () => setKnowledgeOpen(false), asideRef)

  const [docs, setDocs] = useState<DocItem[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge')
      if (!res.ok) return
      const data = await res.json()
      setDocs(data.documents ?? [])
      setKnowledgeCount(data.count ?? { documents: 0, chunks: 0 })
    } catch {
      /* noop */
    }
  }, [setKnowledgeCount])

  useEffect(() => {
    if (knowledgeOpen) refresh()
  }, [knowledgeOpen, refresh])

  // Sube cualquier archivo soportado (PDF/Word/Excel/CSV/TXT): el servidor extrae el texto.
  const onFile = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (title.trim()) fd.append('title', title.trim())
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Falló la subida')
      }
      setTitle('')
      setContent('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar el archivo.')
    } finally {
      setBusy(false)
    }
  }

  const ingest = async () => {
    if (!title.trim() || !content.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), source: 'manual' }),
      })
      if (!res.ok) throw new Error()
      setTitle('')
      setContent('')
      await refresh()
    } catch {
      setError('No se pudo indexar el documento. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (t: string) => {
    try {
      await fetch(`/api/knowledge?title=${encodeURIComponent(t)}`, { method: 'DELETE' })
      await refresh()
    } catch {
      /* noop */
    }
  }

  const field =
    'w-full rounded-lg border border-hairline bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none'

  return (
    <AnimatePresence>
      {knowledgeOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setKnowledgeOpen(false)}
          />
          <motion.aside
            ref={asideRef}
            role="dialog"
            aria-modal="true"
            aria-label="Centro de Datos"
            className="glass fixed left-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto p-6"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
                <Database className="h-4 w-4 accent" aria-hidden="true" />
                Centro de Datos
              </div>
              <button
                type="button"
                onClick={() => setKnowledgeOpen(false)}
                title="Cerrar"
                aria-label="Cerrar centro de datos"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mb-5 text-[11px] text-slate-500">
              Indexa documentos (encuestas, notas, informes). Hermes los recupera por significado (RAG)
              y razona sobre datos reales, citando la fuente.
            </p>

            {/* Alta de documento */}
            <div className="mb-5 space-y-3 rounded-2xl border border-hairline bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-300">
                <Plus className="h-3.5 w-3.5 accent" aria-hidden="true" />
                Nuevo documento
              </div>
              <input
                className={field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título (ej: Encuesta Distrito 5 - Junio)"
                aria-label="Título del documento"
              />
              <textarea
                className={cn(field, 'h-32 resize-none')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Pega aquí el texto del documento…"
                aria-label="Contenido del documento"
              />
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/5">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Subir PDF / Word / Excel / CSV / TXT
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = '' // permite re-subir el mismo archivo
                      if (f) onFile(f)
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={ingest}
                  disabled={busy || !title.trim() || !content.trim()}
                  className="ml-auto rounded-lg px-4 py-1.5 text-xs font-medium text-white transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{ background: 'rgb(var(--hermes-accent) / 0.85)' }}
                >
                  {busy ? 'Indexando…' : 'Indexar'}
                </button>
              </div>
              {error && (
                <p role="alert" className="text-[11px] text-state-crisis">
                  {error}
                </p>
              )}
            </div>

            {/* Documentos indexados */}
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-400">
              Documentos indexados ({docs.length})
            </div>
            {docs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-hairline px-3 py-6 text-center text-[11px] text-slate-500">
                Aún no hay documentos. Indexa el primero para que Hermes razone sobre datos reales.
              </p>
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li
                    key={d.title}
                    className="flex items-center gap-2 rounded-lg border border-hairline bg-white/[0.02] px-3 py-2"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-slate-200">{d.title}</div>
                      <div className="text-[10px] text-slate-500">
                        {d.source ?? 'manual'} · {d.chunks} fragmento{d.chunks === 1 ? '' : 's'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(d.title)}
                      title="Eliminar"
                      aria-label={`Eliminar ${d.title}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-state-crisis"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
