// HERMES — Document Parser (DOC: Módulo 6 "Centro de Datos").
// Extrae texto de PDF / DOCX / XLSX / CSV / texto plano para alimentar el RAG.
// Imports dinámicos: las librerías solo cargan en el servidor cuando se usan.

const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'log'])

export interface ParsedDoc {
  text: string
  kind: string
}

export function extOf(filename: string): string {
  return (filename.split('.').pop() ?? '').toLowerCase()
}

export function isSupported(filename: string): boolean {
  const ext = extOf(filename)
  return ext === 'pdf' || ext === 'docx' || ext === 'xlsx' || ext === 'xls' || TEXT_EXT.has(ext)
}

export async function parseDocument(filename: string, buffer: Buffer): Promise<ParsedDoc> {
  const ext = extOf(filename)
  if (ext === 'pdf') return { text: await parsePdf(buffer), kind: 'pdf' }
  if (ext === 'docx') return { text: await parseDocx(buffer), kind: 'docx' }
  if (ext === 'xlsx' || ext === 'xls') return { text: await parseXlsx(buffer), kind: 'xlsx' }
  if (TEXT_EXT.has(ext)) return { text: buffer.toString('utf8'), kind: ext }
  // Último recurso: tratar como texto.
  return { text: buffer.toString('utf8'), kind: ext || 'bin' }
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((it) => (it as { str?: string }).str ?? '').join(' ') + '\n'
  }
  await doc.destroy()
  return text.trim()
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  return value.trim()
}

async function parseXlsx(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'buffer' })
  let out = ''
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    out += `# Hoja: ${name}\n${XLSX.utils.sheet_to_csv(sheet)}\n\n`
  }
  return out.trim()
}
