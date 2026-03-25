import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FloatingWordsProps {
  calmLevel: number
}

const affirmations = [
  { word: '平静', hue: 200 },
  { word: '安宁', hue: 220 },
  { word: '自由', hue: 270 },
  { word: '勇气', hue: 340 },
  { word: '希望', hue: 45 },
  { word: '感恩', hue: 160 },
  { word: '释然', hue: 185 },
  { word: '接纳', hue: 260 },
  { word: '温柔', hue: 310 },
  { word: '力量', hue: 30 },
  { word: '当下', hue: 190 },
  { word: '呼吸', hue: 170 },
]

function createWordTexture(word: string, hue: number) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 256, 128)

  // Ink splash background — irregular soft blob
  const blobG = ctx.createRadialGradient(128, 64, 2, 128, 64, 96)
  blobG.addColorStop(0, `hsla(${hue}, 65%, 70%, 0.18)`)
  blobG.addColorStop(0.5, `hsla(${hue}, 55%, 60%, 0.08)`)
  blobG.addColorStop(1, `hsla(${hue}, 40%, 50%, 0)`)
  ctx.fillStyle = blobG
  ctx.fillRect(0, 0, 256, 128)

  // Deep shadow glow (ink-bleed effect)
  ctx.shadowColor = `hsla(${hue}, 80%, 75%, 0.55)`
  ctx.shadowBlur = 22
  ctx.font = '200 42px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = `hsla(${hue}, 55%, 90%, 0.35)`
  ctx.fillText(word, 128, 64)

  // Mid-layer stroke
  ctx.shadowBlur = 10
  ctx.fillStyle = `hsla(${hue}, 60%, 88%, 0.65)`
  ctx.fillText(word, 128, 64)

  // Crisp top layer
  ctx.shadowBlur = 3
  ctx.fillStyle = `hsla(${hue}, 40%, 96%, 0.88)`
  ctx.fillText(word, 128, 64)

  // Subtle horizontal ink streak beneath character
  ctx.globalAlpha = 0.08
  ctx.fillStyle = `hsla(${hue}, 70%, 70%, 1)`
  ctx.fillRect(96, 82, 64, 2)
  ctx.globalAlpha = 1

  return new THREE.CanvasTexture(c)
}

// A faint particle halo orbiting each word
function makeHaloTex() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
  return new THREE.CanvasTexture(c)
}
const HALO_TEX = makeHaloTex()

export function FloatingWords({ calmLevel }: FloatingWordsProps) {
  const count = Math.min(Math.floor(calmLevel / 10) + 1, affirmations.length)

  const wordData = useMemo(() => {
    return affirmations.map((item, i) => {
      const angle = (i / affirmations.length) * Math.PI * 2 + i * 0.21
      const radius = 5.2 + (i % 4) * 1.1
      const height = 1.4 + Math.sin(i * 2.1) * 2.0
      const texture = createWordTexture(item.word, item.hue)
      // Each word has unique orbit speed + phase
      const orbitSpeed = 0.042 + i * 0.006
      const floatPhase = i * 0.85
      const floatAmp = 0.32 + (i % 3) * 0.12
      const floatFreq = 0.3 + (i % 4) * 0.08
      return { ...item, angle, radius, height, texture, orbitSpeed, floatPhase, floatAmp, floatFreq }
    })
  }, [])

  return (
    <group>
      {wordData.slice(0, count).map((w, i) => (
        <FloatingWord key={i} data={w} index={i} />
      ))}
    </group>
  )
}

interface WordData {
  hue: number
  angle: number
  radius: number
  height: number
  texture: THREE.CanvasTexture
  orbitSpeed: number
  floatPhase: number
  floatAmp: number
  floatFreq: number
}

const HALO_COUNT = 6

function FloatingWord({ data, index }: { data: WordData; index: number }) {
  const mainRef = useRef<THREE.Sprite>(null)
  const echoRef = useRef<THREE.Sprite>(null)
  const echo2Ref = useRef<THREE.Sprite>(null)
  const haloRef = useRef<THREE.Points>(null)
  const haloPositions = useMemo(() => {
    const pos = new Float32Array(HALO_COUNT * 3)
    const phases = new Float32Array(HALO_COUNT)
    for (let i = 0; i < HALO_COUNT; i++) {
      phases[i] = (i / HALO_COUNT) * Math.PI * 2
    }
    return { pos, phases }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const angle = data.angle + t * data.orbitSpeed
    const x = Math.cos(angle) * data.radius
    const y = data.height + Math.sin(t * data.floatFreq + data.floatPhase) * data.floatAmp
    const z = Math.sin(angle) * data.radius

    // Gentle breathe opacity
    const breathe = 0.38 + Math.sin(t * 0.55 + index * 2.1) * 0.14
    // Fade-in for newly appeared words (use angle as proxy for birth time)
    const ageT = t - index * 2.5
    const fadeIn = Math.min(1, Math.max(0, ageT * 0.35))

    if (mainRef.current) {
      mainRef.current.position.set(x, y, z)
      ;(mainRef.current.material as THREE.SpriteMaterial).opacity = breathe * fadeIn
    }

    // Echo 1: 0.35s behind
    if (echoRef.current) {
      const a2 = data.angle + (t - 0.35) * data.orbitSpeed
      const y2 = data.height + Math.sin((t - 0.35) * data.floatFreq + data.floatPhase) * data.floatAmp
      echoRef.current.position.set(Math.cos(a2) * data.radius, y2, Math.sin(a2) * data.radius)
      ;(echoRef.current.material as THREE.SpriteMaterial).opacity = breathe * 0.16 * fadeIn
    }

    // Echo 2: 0.7s behind
    if (echo2Ref.current) {
      const a3 = data.angle + (t - 0.7) * data.orbitSpeed
      const y3 = data.height + Math.sin((t - 0.7) * data.floatFreq + data.floatPhase) * data.floatAmp
      echo2Ref.current.position.set(Math.cos(a3) * data.radius, y3, Math.sin(a3) * data.radius)
      ;(echo2Ref.current.material as THREE.SpriteMaterial).opacity = breathe * 0.07 * fadeIn
    }

    // Halo particles orbit the word
    if (haloRef.current) {
      haloRef.current.position.set(x, y, z)
      const pos = haloRef.current.geometry.attributes.position
      for (let i = 0; i < HALO_COUNT; i++) {
        const hp = haloPositions.phases[i] + t * (0.6 + index * 0.05)
        const hr = 0.55 + Math.sin(t * 0.4 + i) * 0.1
        ;(pos.array as Float32Array)[i * 3] = Math.cos(hp) * hr
        ;(pos.array as Float32Array)[i * 3 + 1] = Math.sin(hp * 0.7) * 0.2
        ;(pos.array as Float32Array)[i * 3 + 2] = Math.sin(hp) * hr
      }
      pos.needsUpdate = true
      ;(haloRef.current.material as THREE.PointsMaterial).opacity = breathe * 0.22 * fadeIn
      // Tint halo with word hue
      ;(haloRef.current.material as THREE.PointsMaterial).color.setHSL(data.hue / 360, 0.7, 0.8)
    }
  })

  const haloInitPos = useMemo(() => new Float32Array(HALO_COUNT * 3), [])

  return (
    <group>
      {/* Echo 2 (farthest behind) */}
      <sprite ref={echo2Ref} scale={[1.95, 0.58, 1]}>
        <spriteMaterial map={data.texture} transparent opacity={0} depthTest={false} />
      </sprite>
      {/* Echo 1 */}
      <sprite ref={echoRef} scale={[1.85, 0.55, 1]}>
        <spriteMaterial map={data.texture} transparent opacity={0} depthTest={false} />
      </sprite>
      {/* Main word */}
      <sprite ref={mainRef} scale={[1.7, 0.5, 1]}>
        <spriteMaterial map={data.texture} transparent opacity={0.38} depthTest={false} />
      </sprite>
      {/* Orbiting halo dots */}
      <points ref={haloRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[haloInitPos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={HALO_TEX}
          size={0.06}
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          color="#a0c0ff"
        />
      </points>
    </group>
  )
}
