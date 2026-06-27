import { chromium } from 'playwright-core'
const OUT = process.argv[2]
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
const ctx = await browser.newContext({ viewport: { width: 1500, height: 860 }, permissions: ['camera'] })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message))
page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE: ' + m.text()))
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
await pause(6000)

// 1) ZOOM/EXPAND: inyecta una ventana de imágenes y amplíala
const r1 = await page.evaluate(async () => {
  const cc = window.__cc
  if (!cc) return 'no-store'
  const img = await (await fetch('/api/media?type=image&q=' + encodeURIComponent('paisajes de Mexico'))).json()
  cc.getState().setAwake(true)
  cc.getState().clearWindows()
  cc.getState().addWindow({ id: 'i1', title: 'fotos de paisajes', content: '', loading: false, media: { kind: 'image', items: img.items || [] } })
  cc.getState().setExpandedId('i1')
  cc.getState().setFaceEnabled(true) // 2) enciende reconocimiento facial (cámara falsa)
  return 'ok img=' + (img.items || []).length
})
await pause(8000) // deja cargar imágenes + face-api desde CDN
await page.screenshot({ path: `${OUT}/zoom-face.png`, timeout: 60000 })
const faceStatus = await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('div,p')).find((d) => /Cargando reconocimiento|Buscando rostro|Registrar mi rostro|Hola,|Cámara no/.test(d.textContent || ''))
  return el ? el.textContent.slice(0, 60) : 'sin panel'
})
console.log('INJECT:', r1, '| FACE:', faceStatus)
console.log('ERRORS:', errors.length ? JSON.stringify(errors.slice(0, 6)) : 'none')
await browser.close()
