'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BRAIN_REGIONS } from '../brain-regions'
import type { HermesState } from '../types'

/**
 * NEURAL BRAIN — el centro VIVO del Command Center (estilo "Z.E.R.O." / Jarvis).
 * - Vivo: ondas de energía que viajan del núcleo hacia afuera + latido + ráfagas. Nunca estático
 *   (DOC: "la interfaz nunca debe sentirse estática; todo debe moverse").
 * - Interactivo: cuando Hermes consulta a un especialista, su región se ILUMINA y dispara
 *   ("el usuario pide → busca → encuentra → muestra"). Ráfaga al empezar a buscar y al responder.
 * reduce-motion: se calma (más lento/suave) pero NO se congela — el cerebro es la identidad del producto.
 */

const ACTIVITY_BY_STATE: Record<HermesState, number> = {
  idle: 0.32,
  listening: 0.62,
  processing: 1.0,
  responding: 0.82,
}

export type BrainVariant = 'aurora' | 'jarvis' | 'plasma' | 'matrix' | 'gold'

// Paletas por variante. 'aurora' = null → usa los colores por región (arcoíris original).
const VARIANT_PALETTES: Record<BrainVariant, number[] | null> = {
  aurora: null,
  jarvis: [0x22d3ee, 0x38bdf8, 0x67e8f9, 0x0ea5e9, 0x7dd3fc], // cian monocromo (Jarvis clásico)
  plasma: [0xa855f7, 0xd946ef, 0xf472b6, 0x8b5cf6, 0xec4899], // violeta/magenta (nebulosa)
  matrix: [0x22c55e, 0x4ade80, 0x16a34a, 0x86efac, 0x34d399], // verde
  gold: [0xfbbf24, 0xf59e0b, 0xfcd34d, 0xeab308, 0xfde68a], // oro/ámbar
}

const VARIANT_CORE: Record<BrainVariant, number> = {
  aurora: 0xeaf6ff,
  jarvis: 0xbdf0ff,
  plasma: 0xf5d0ff,
  matrix: 0xc8ffd6,
  gold: 0xfff0c8,
}

export function NeuralBrain({
  state,
  activeRegions,
  className,
  variant = 'aurora',
}: {
  state: HermesState
  activeRegions?: number[]
  className?: string
  variant?: BrainVariant
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const activityTargetRef = useRef(ACTIVITY_BY_STATE.idle)
  const regionTargetRef = useRef<number[]>(new Array(BRAIN_REGIONS.length).fill(0))
  const burstRef = useRef(0)
  const prevStateRef = useRef<HermesState>('idle')

  useEffect(() => {
    activityTargetRef.current = ACTIVITY_BY_STATE[state]
    // Ráfaga al activarse (listening = ignición por aplauso), al buscar y al encontrar/responder.
    if (state !== prevStateRef.current && state !== 'idle') {
      burstRef.current = 1
    }
    prevStateRef.current = state
  }, [state])

  useEffect(() => {
    const target = new Array(BRAIN_REGIONS.length).fill(0)
    for (const r of activeRegions ?? []) if (r >= 0 && r < target.length) target[r] = 1
    regionTargetRef.current = target
    if ((activeRegions ?? []).length > 0) burstRef.current = Math.max(burstRef.current, 0.85)
  }, [activeRegions])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const motion = reduced ? 0.4 : 1 // factor global de movimiento (calmado, no congelado)

    const width = mount.clientWidth || 600
    const height = mount.clientHeight || 600

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 0, 4.5)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    // ---------- Asignación de región por ángulo de pantalla (alineado con las etiquetas) ----------
    const regionAngles = BRAIN_REGIONS.map((r) => (r.angle * Math.PI) / 180)
    const nearestRegion = (x: number, y: number) => {
      const a = Math.atan2(-y, x) // pantalla: +y hacia arriba → -y abajo (como las etiquetas)
      let best = 0
      let bestD = Infinity
      for (let i = 0; i < regionAngles.length; i++) {
        let d = Math.abs(a - regionAngles[i])
        d = Math.min(d, Math.PI * 2 - d)
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return best
    }

    // ---------- Neuronas ----------
    const COUNT = 3600
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)
    const sizes = new Float32Array(COUNT)
    const regionAttr = new Float32Array(COUNT)
    const color = new THREE.Color()

    // Color de cada partícula/sinapsis según la variante elegida (aurora = color por región).
    const palette = VARIANT_PALETTES[variant] ?? null
    const hexForRegion = (region: number) =>
      palette ? palette[region % palette.length] : BRAIN_REGIONS[region].hex

    for (let i = 0; i < COUNT; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = Math.pow(Math.random(), 0.55)
      let x = r * Math.sin(phi) * Math.cos(theta) * 1.35
      const y = r * Math.sin(phi) * Math.sin(theta) * 1.0
      const z = r * Math.cos(phi) * 1.15
      const side = x >= 0 ? 1 : -1
      x += side * 0.1
      if (Math.abs(x) < 0.07) x += side * 0.07
      const n = 0.12
      const fx = x + (Math.random() - 0.5) * n
      const fy = y + (Math.random() - 0.5) * n
      const fz = z + (Math.random() - 0.5) * n

      positions[i * 3] = fx
      positions[i * 3 + 1] = fy
      positions[i * 3 + 2] = fz

      const region = nearestRegion(fx, fy)
      regionAttr[i] = region
      color.setHex(hexForRegion(region))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      seeds[i] = Math.random()
      sizes[i] = 1.3 + Math.random() * 2.4
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aRegion', new THREE.BufferAttribute(regionAttr, 1))

    const uniforms = {
      uTime: { value: 0 },
      uActivity: { value: ACTIVITY_BY_STATE.idle },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uWave: { value: 0 },
      uBurst: { value: 0 },
      uRegionActivity: { value: new Array(BRAIN_REGIONS.length).fill(0) },
    }

    const pointsMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSeed;
        attribute float aSize;
        attribute float aRegion;
        uniform float uTime;
        uniform float uActivity;
        uniform float uPixelRatio;
        uniform float uWave;
        uniform float uBurst;
        uniform float uRegionActivity[${BRAIN_REGIONS.length}];
        varying vec3 vColor;
        varying float vGlow;
        void main() {
          vColor = aColor;
          float pulse = 0.5 + 0.5 * sin(uTime * 2.4 + aSeed * 6.2831);
          float energy = mix(0.4, 1.0, uActivity);
          float dist = length(position);
          // onda de energía viajando del núcleo hacia afuera
          float wavePos = uWave * 2.3;
          float wave = exp(-pow((dist - wavePos) * 3.5, 2.0));
          // activación de región (se ilumina lo que Hermes está consultando)
          float region = uRegionActivity[int(aRegion + 0.5)];
          float glow = 0.4 + pulse * 0.5 * energy + wave * 0.9 + region * 1.3 + uBurst * 0.7;
          vGlow = glow;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float size = aSize * (0.6 + pulse * 0.7 * energy + wave * 1.3 + region * 1.2 + uBurst * 0.6);
          gl_PointSize = size * uPixelRatio * (13.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec3 vColor;
        varying float vGlow;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          a = pow(a, 1.7);
          gl_FragColor = vec4(vColor * vGlow * 1.7, a);
        }
      `,
    })
    const points = new THREE.Points(geo, pointsMat)
    group.add(points)

    // ---------- Sinapsis ----------
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < COUNT; i++) pts.push(new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]))
    const linePositions: number[] = []
    const lineColors: number[] = []
    const sample = pts.filter((_, i) => i % 3 === 0)
    for (let i = 0; i < sample.length; i++) {
      const a = sample[i]
      let nearest: THREE.Vector3 | null = null
      let bestd = Infinity
      for (let j = 0; j < sample.length; j++) {
        if (i === j) continue
        const d = a.distanceToSquared(sample[j])
        if (d < bestd && d > 0.0001) {
          bestd = d
          nearest = sample[j]
        }
      }
      if (nearest && bestd < 0.16) {
        linePositions.push(a.x, a.y, a.z, nearest.x, nearest.y, nearest.z)
        color.setHex(hexForRegion(i % BRAIN_REGIONS.length))
        lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b)
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3))
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const synapses = new THREE.LineSegments(lineGeo, lineMat)
    group.add(synapses)

    // (Sin filamentos radiales: el usuario pidió dejar SOLO el cerebro, sin las líneas que salían detrás.)

    // ---------- Núcleo + onda de choque (glow texture) ----------
    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = glowCanvas.height = 128
    const gctx = glowCanvas.getContext('2d')!
    const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.25, 'rgba(220,240,255,0.7)')
    grad.addColorStop(1, 'rgba(180,220,255,0)')
    gctx.fillStyle = grad
    gctx.fillRect(0, 0, 128, 128)
    const glowTex = new THREE.CanvasTexture(glowCanvas)

    const coreMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: VARIANT_CORE[variant],
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const core = new THREE.Sprite(coreMat)
    core.scale.set(1.25, 1.25, 1.25)
    group.add(core)

    // onda de choque (ráfaga "encontrado")
    const shockMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: VARIANT_CORE[variant],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const shock = new THREE.Sprite(shockMat)
    group.add(shock)

    // ---------- Loop ----------
    const clock = new THREE.Clock()
    let raf = 0
    const regionVal = uniforms.uRegionActivity.value as number[]
    const render = () => {
      const dt = Math.min(clock.getDelta(), 0.05) * motion
      uniforms.uTime.value += dt
      const t = uniforms.uTime.value

      uniforms.uActivity.value += (activityTargetRef.current - uniforms.uActivity.value) * Math.min(dt * 2.5, 1)
      const act = uniforms.uActivity.value

      // región: lerp hacia objetivo
      const tgt = regionTargetRef.current
      for (let i = 0; i < regionVal.length; i++) {
        regionVal[i] += (tgt[i] - regionVal[i]) * Math.min(dt * 3.5, 1)
      }

      // ráfaga: decae
      burstRef.current = Math.max(0, burstRef.current - dt * 1.6)
      uniforms.uBurst.value = burstRef.current

      // onda viajera del núcleo hacia afuera (repite) — el "latido neuronal"
      uniforms.uWave.value = (t * (0.45 + act * 0.35)) % 1.0

      // movimiento suave (mantiene regiones bajo sus etiquetas)
      group.rotation.y = Math.sin(t * 0.15) * 0.4
      group.rotation.x = Math.sin(t * 0.21) * 0.12 + 0.04

      const pulse = 0.5 + 0.5 * Math.sin(t * 3.0)
      core.scale.setScalar(0.95 + pulse * 0.25 * act + burstRef.current * 0.4)
      coreMat.opacity = 0.55 + pulse * 0.4 * act

      // onda de choque al disparar ráfaga
      const sc = 1.5 + (1 - burstRef.current) * 5.5
      shock.scale.setScalar(sc)
      shockMat.opacity = burstRef.current * 0.5

      renderer.render(scene, camera)
      raf = requestAnimationFrame(render)
    }
    render()

    const onResize = () => {
      const w = mount.clientWidth || width
      const h = mount.clientHeight || height
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      geo.dispose()
      pointsMat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      coreMat.dispose()
      shockMat.dispose()
      glowTex.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
    // Reconstruye al cambiar de variante (cambia paleta de partículas/sinapsis/núcleo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant])

  return <div ref={mountRef} className={className} aria-hidden="true" />
}
