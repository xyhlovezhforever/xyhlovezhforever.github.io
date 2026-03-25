import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface WishLanternsProps {
  lanterns: { id: number; text: string; startTime: number }[]
}

export function WishLanterns({ lanterns }: WishLanternsProps) {
  return (
    <group>
      {lanterns.map(l => (
        <RisingLantern key={l.id} text={l.text} startTime={l.startTime} id={l.id} />
      ))}
    </group>
  )
}

// Lantern body geometry - hexagonal paper lantern
const lanternBodyGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.2, 6)
const lanternCapGeo = new THREE.CylinderGeometry(0.04, 0.09, 0.06, 6)
const lanternBottomCapGeo = new THREE.CylinderGeometry(0.09, 0.04, 0.04, 6)

// Ember texture
function makeEmberTex() {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,230,150,1)')
  g.addColorStop(0.3, 'rgba(255,140,30,0.8)')
  g.addColorStop(0.7, 'rgba(255,80,10,0.3)')
  g.addColorStop(1, 'rgba(255,60,0,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
}
const EMBER_TEX = makeEmberTex()

function makeTrailTex() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
  g.addColorStop(0, 'rgba(255,200,100,0.9)')
  g.addColorStop(0.5, 'rgba(255,120,20,0.4)')
  g.addColorStop(1, 'rgba(255,80,0,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
  return new THREE.CanvasTexture(c)
}
const TRAIL_TEX = makeTrailTex()

const EMBER_COUNT = 20
const TRAIL_COUNT = 40

function RisingLantern({ text, startTime, id }: { text: string; startTime: number; id: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const trailRef = useRef<THREE.Points>(null)
  const emberRef = useRef<THREE.Points>(null)
  const flameRef = useRef<THREE.Mesh>(null)
  const innerFlameRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)
  const phase = useRef(Math.random() * Math.PI * 2)

  const trailPositions = useMemo(() => new Float32Array(TRAIL_COUNT * 3), [])

  const emberPositions = useMemo(() => {
    const pos = new Float32Array(EMBER_COUNT * 3)
    const vel = new Float32Array(EMBER_COUNT * 3)
    const life = new Float32Array(EMBER_COUNT)
    for (let i = 0; i < EMBER_COUNT; i++) {
      life[i] = Math.random() // stagger initial life
    }
    return { pos, vel, life }
  }, [])

  const textTexture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 80
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, 256, 80)

    // Warm paper-glow background
    const bg = ctx.createRadialGradient(128, 40, 5, 128, 40, 110)
    bg.addColorStop(0, 'rgba(255,170,60,0.12)')
    bg.addColorStop(1, 'rgba(255,100,20,0)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 256, 80)

    // Double shadow glow for the text
    ctx.shadowColor = 'rgba(255,170,60,0.7)'
    ctx.shadowBlur = 14
    ctx.font = '400 24px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,235,160,0.95)'
    ctx.fillText(text, 128, 40)
    ctx.shadowBlur = 5
    ctx.fillStyle = 'rgba(255,255,200,1)'
    ctx.fillText(text, 128, 40)

    return new THREE.CanvasTexture(c)
  }, [text])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const elapsed = state.clock.elapsedTime - startTime
    if (elapsed < 0) { groupRef.current.visible = false; return }

    const t = elapsed
    const speed = 0.38
    const y = t * speed
    const swayX = Math.sin(t * 0.38 + phase.current) * (0.45 + t * 0.04)
    const swayZ = Math.cos(t * 0.22 + phase.current * 1.4) * (0.28 + t * 0.025)

    groupRef.current.position.set(swayX, y + 1.5, swayZ)
    groupRef.current.visible = y < 30

    // Tilt follows sway direction
    groupRef.current.rotation.z = Math.sin(t * 0.38 + phase.current) * 0.1
    groupRef.current.rotation.x = Math.cos(t * 0.22 + phase.current) * 0.06

    // Fade envelope
    const fadeIn = Math.min(1, t * 2.5)
    const fadeOut = y < 23 ? 1 : Math.max(0, 1 - (y - 23) / 7)
    const opacity = fadeIn * fadeOut

    // Flame flicker — compound frequencies for organic feel
    const flicker = 0.85
      + Math.sin(t * 18 + id * 7.3) * 0.08
      + Math.sin(t * 27 + id * 3.1) * 0.04
      + Math.sin(t * 11 + id * 5.7) * 0.03

    if (flameRef.current) {
      flameRef.current.scale.set(flicker * 0.9, 0.65 + Math.sin(t * 22) * 0.18, flicker * 0.9)
      ;(flameRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * (0.7 + flicker * 0.3)
    }
    if (innerFlameRef.current) {
      innerFlameRef.current.scale.set(flicker * 0.5, 0.5 + Math.sin(t * 25) * 0.2, flicker * 0.5)
      ;(innerFlameRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.95
    }
    if (glowRef.current) {
      const glowScale = 0.35 + flicker * 0.08
      glowRef.current.scale.setScalar(glowScale)
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.09
    }

    // Point light flicker
    if (pointLightRef.current) {
      pointLightRef.current.intensity = opacity * (0.5 + flicker * 0.3)
      pointLightRef.current.position.set(swayX, y + 1.5 - 0.08, swayZ)
    }

    // Trailing smoke
    if (trailRef.current) {
      const pos = trailRef.current.geometry.attributes.position
      for (let i = TRAIL_COUNT - 1; i > 0; i--) {
        ;(pos.array as Float32Array)[i * 3] = (pos.array as Float32Array)[(i - 1) * 3] + (Math.random() - 0.5) * 0.015
        ;(pos.array as Float32Array)[i * 3 + 1] = (pos.array as Float32Array)[(i - 1) * 3 + 1] - 0.018
        ;(pos.array as Float32Array)[i * 3 + 2] = (pos.array as Float32Array)[(i - 1) * 3 + 2] + (Math.random() - 0.5) * 0.015
      }
      ;(pos.array as Float32Array)[0] = (Math.random() - 0.5) * 0.04
      ;(pos.array as Float32Array)[1] = -0.15
      ;(pos.array as Float32Array)[2] = (Math.random() - 0.5) * 0.04
      pos.needsUpdate = true
      ;(trailRef.current.material as THREE.PointsMaterial).opacity = opacity * 0.45
    }

    // Embers / sparks
    if (emberRef.current) {
      const pos = emberRef.current.geometry.attributes.position
      for (let i = 0; i < EMBER_COUNT; i++) {
        emberPositions.life[i] -= delta * (1 + Math.random() * 0.5)
        if (emberPositions.life[i] <= 0) {
          // Re-spawn ember near flame bottom
          emberPositions.pos[i * 3] = (Math.random() - 0.5) * 0.05
          emberPositions.pos[i * 3 + 1] = -0.12
          emberPositions.pos[i * 3 + 2] = (Math.random() - 0.5) * 0.05
          emberPositions.vel[i * 3] = (Math.random() - 0.5) * 0.08
          emberPositions.vel[i * 3 + 1] = 0.04 + Math.random() * 0.06
          emberPositions.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.08
          emberPositions.life[i] = 0.5 + Math.random() * 0.8
        }
        // Physics: rise, drift
        emberPositions.pos[i * 3] += emberPositions.vel[i * 3] * delta
        emberPositions.pos[i * 3 + 1] += emberPositions.vel[i * 3 + 1] * delta
        emberPositions.pos[i * 3 + 2] += emberPositions.vel[i * 3 + 2] * delta
        emberPositions.vel[i * 3] *= 0.98 // drag
        emberPositions.vel[i * 3 + 2] *= 0.98

        ;(pos.array as Float32Array)[i * 3] = emberPositions.pos[i * 3]
        ;(pos.array as Float32Array)[i * 3 + 1] = emberPositions.pos[i * 3 + 1]
        ;(pos.array as Float32Array)[i * 3 + 2] = emberPositions.pos[i * 3 + 2]
      }
      pos.needsUpdate = true
      ;(emberRef.current.material as THREE.PointsMaterial).opacity = opacity * 0.65
    }

    // Traverse non-light children for opacity
    groupRef.current.traverse(obj => {
      if (obj === groupRef.current) return
      if (obj.type === 'PointLight') return
      const mesh = obj as THREE.Mesh
      if (mesh.material && 'opacity' in mesh.material && (mesh.material as any)._baseOpacity !== undefined) {
        ;(mesh.material as THREE.MeshBasicMaterial).opacity = (mesh.material as any)._baseOpacity * opacity
      }
    })
  })

  const emberInitPos = useMemo(() => new Float32Array(EMBER_COUNT * 3), [])

  return (
    <group ref={groupRef}>
      {/* Top cap */}
      <mesh geometry={lanternCapGeo} position={[0, 0.13, 0]}>
        <meshStandardMaterial
          color="#cc5500"
          emissive="#ff4400"
          emissiveIntensity={0.3}
          transparent opacity={0.9}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.9 }}
        />
      </mesh>

      {/* Paper body */}
      <mesh geometry={lanternBodyGeo}>
        <meshStandardMaterial
          color="#ff7722"
          emissive="#ff5500"
          emissiveIntensity={0.25}
          transparent opacity={0.82}
          side={THREE.DoubleSide}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.82 }}
        />
      </mesh>

      {/* Inner warm glow (makes paper look translucent) */}
      <mesh scale={0.85}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.15 }}
        />
      </mesh>

      {/* Bottom cap */}
      <mesh geometry={lanternBottomCapGeo} position={[0, -0.12, 0]}>
        <meshStandardMaterial
          color="#cc5500"
          emissive="#ff4400"
          emissiveIntensity={0.3}
          transparent opacity={0.9}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.9 }}
        />
      </mesh>

      {/* Flame outer */}
      <mesh ref={flameRef} position={[0, -0.06, 0]}>
        <coneGeometry args={[0.022, 0.055, 5, 1, true]} />
        <meshBasicMaterial
          color="#ffaa22"
          transparent opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.8 }}
        />
      </mesh>

      {/* Flame inner (bright core) */}
      <mesh ref={innerFlameRef} position={[0, -0.045, 0]}>
        <coneGeometry args={[0.012, 0.038, 4, 1, true]} />
        <meshBasicMaterial
          color="#fff4aa"
          transparent opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.95 }}
        />
      </mesh>

      {/* Glow sphere around flame */}
      <mesh ref={glowRef} position={[0, -0.06, 0]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.09 }}
        />
      </mesh>

      {/* Hanging strings (4 corners) */}
      {[[-0.075, 0, -0.065], [0.075, 0, -0.065], [-0.075, 0, 0.065], [0.075, 0, 0.065]].map((pos, i) => (
        <mesh key={i} position={pos as [number,number,number]} rotation={[0.3, i * Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.0015, 0.0015, 0.12, 3]} />
          <meshStandardMaterial color="#8B6914" transparent opacity={0.7} ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.7 }} />
        </mesh>
      ))}

      {/* Text sprite floating above */}
      <sprite position={[0, 0.32, 0]} scale={[1.3, 0.32, 1]}>
        <spriteMaterial
          map={textTexture}
          transparent opacity={0.9}
          depthTest={false}
          ref={(mat) => { if (mat) (mat as any)._baseOpacity = 0.9 }}
        />
      </sprite>

      {/* Smoke / ember trail */}
      <points ref={trailRef} position={[0, -0.06, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={TRAIL_TEX} size={0.045} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>

      {/* Embers / sparks */}
      <points ref={emberRef} position={[0, -0.06, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[emberInitPos, 3]} />
        </bufferGeometry>
        <pointsMaterial map={EMBER_TEX} size={0.035} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>

      {/* Dynamic point light — positioned in world space via useFrame */}
      <pointLight
        ref={pointLightRef}
        color="#ff8833"
        intensity={0.5}
        distance={2.5}
        decay={2}
      />
    </group>
  )
}
