import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef, useMemo } from 'react'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { FloatingIsland } from './FloatingIsland'
import { AnxietyBubbles } from './AnxietyBubbles'
import { ParticleField } from './ParticleField'
import { ZenGarden } from './ZenGarden'
import { Sky } from './Sky'
import { Fireflies } from './Fireflies'
import { MeditationStones } from './MeditationStones'
import { WishLanterns } from './WishLanterns'
import { WindChimes } from './WindChimes'
import { FloatingWords } from './FloatingWords'
import { RainSystem } from './RainSystem'

interface GameSceneProps {
  onBubblePopped: (combo: number) => void
  onStoneCollected: (message: string) => void
  onChime: (noteIndex: number) => void
  calmLevel: number
  raining: boolean
  lanterns: { id: number; text: string; startTime: number }[]
}

// Volumetric god-ray cones from above
function VolumetricLight({ raining }: { raining: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const shafts = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    x: (i - 2) * 2.5,
    z: -3 + (i % 2) * 2,
    rot: -0.05 + i * 0.02,
    speed: 0.12 + i * 0.04,
    phase: i * 1.2,
    w: 0.6 + (i % 3) * 0.35,
  })), [])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const s = shafts[i]
      if (!s) return
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = (raining ? 0.012 : 0.025) + Math.sin(t * s.speed + s.phase) * 0.008
    })
  })

  return (
    <group ref={groupRef}>
      {shafts.map((s, i) => (
        <mesh key={i} position={[s.x, 6, s.z]} rotation={[s.rot, i * 0.4, 0]}>
          <coneGeometry args={[s.w, 14, 6, 1, true]} />
          <meshBasicMaterial
            color="#c4b5fd"
            transparent
            opacity={0.02}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

// Volumetric mist layer near ground
function GroundMist() {
  const ref = useRef<THREE.Points>(null)
  const data = useMemo(() => {
    const count = 120
    const pos = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 2 + Math.random() * 6
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = -0.3 + Math.random() * 0.8
      pos[i * 3 + 2] = Math.sin(angle) * r
      speeds[i] = 0.0003 + Math.random() * 0.0004
    }
    return { pos, speeds, count }
  }, [])

  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(180,200,240,0.5)')
    g.addColorStop(0.5, 'rgba(160,180,220,0.15)')
    g.addColorStop(1, 'rgba(140,160,200,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position
    const t = state.clock.elapsedTime
    for (let i = 0; i < data.count; i++) {
      const x = pos.array[i * 3] as number
      const z = pos.array[i * 3 + 2] as number
      const angle = Math.atan2(z, x) + data.speeds[i]
      const dist = Math.sqrt(x * x + z * z)
      ;(pos.array as Float32Array)[i * 3] = Math.cos(angle) * dist
      ;(pos.array as Float32Array)[i * 3 + 1] = -0.3 + Math.sin(t * 0.3 + i * 0.4) * 0.25 + 0.25
      ;(pos.array as Float32Array)[i * 3 + 2] = Math.sin(angle) * dist
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={1.2} transparent opacity={0.18} depthWrite={false} blending={THREE.NormalBlending} sizeAttenuation />
    </points>
  )
}

// Subtle screen-space ripple on camera: slight FOV breathing
function CameraBreath({ calmLevel }: { calmLevel: number }) {
  const { camera } = useThree()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const base = 52
    const breathe = Math.sin(t * 0.22) * (0.6 + calmLevel * 0.008)
    ;(camera as THREE.PerspectiveCamera).fov = base - breathe
    ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
  })
  return null
}

// Distant atmospheric clouds
function AtmosphericClouds({ raining }: { raining: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const clouds = useMemo(() => Array.from({ length: 8 }, (_, _i) => ({
    x: (Math.random() - 0.5) * 40,
    y: 7 + Math.random() * 6,
    z: -12 - Math.random() * 20,
    sx: 6 + Math.random() * 8,
    sy: 1 + Math.random() * 2,
    sz: 4 + Math.random() * 5,
    speed: 0.003 + Math.random() * 0.004,
    phase: Math.random() * Math.PI * 2,
  })), [])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const c = clouds[i]
      if (!c) return
      child.position.x = c.x + Math.sin(t * c.speed + c.phase) * 3
      ;(child as THREE.Mesh).material &&
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity !== undefined &&
        (((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = raining ? 0.06 : 0.025)
    })
  })

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} scale={[c.sx, c.sy, c.sz]}>
          <sphereGeometry args={[1, 7, 5]} />
          <meshBasicMaterial
            color={raining ? '#1a2035' : '#6a7aaa'}
            transparent opacity={0.025}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// Spirit orbs — drift in beautiful arcs, appear at high calm
function SpiritOrbs({ calmLevel }: { calmLevel: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const ORB_COUNT = 8
  const orbData = useMemo(() => Array.from({ length: ORB_COUNT }, (_, i) => ({
    angle: (i / ORB_COUNT) * Math.PI * 2,
    radius: 3.5 + (i % 3) * 1.2,
    height: 1.5 + i * 0.4,
    speed: 0.15 + i * 0.025,
    phase: i * 0.78,
    hue: 200 + i * 22,
    size: 0.06 + (i % 3) * 0.025,
  })), [])

  const visibleCount = Math.floor((calmLevel / 100) * ORB_COUNT)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      if (i >= visibleCount) { child.visible = false; return }
      const d = orbData[i]
      const angle = d.angle + t * d.speed
      const x = Math.cos(angle) * d.radius
      const y = d.height + Math.sin(t * 0.3 + d.phase) * 0.6
      const z = Math.sin(angle) * d.radius
      child.position.set(x, y, z)
      child.visible = true

      const grp = child as THREE.Group
      const pulse = 0.5 + Math.sin(t * 1.8 + d.phase) * 0.3
      if (grp.children[0]) {
        grp.children[0].scale.setScalar(d.size * (0.8 + pulse * 0.4))
        ;(( grp.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse * 0.7
      }
      if (grp.children[1]) {
        grp.children[1].scale.setScalar(d.size * 2.2)
        ;((grp.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse * 0.12
      }
    })
  })

  return (
    <group ref={groupRef}>
      {orbData.map((d, i) => (
        <group key={i} visible={false}>
          <mesh>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color={new THREE.Color().setHSL(d.hue / 360, 0.8, 0.75)}
              transparent opacity={0.6}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial
              color={new THREE.Color().setHSL(d.hue / 360, 0.7, 0.85)}
              transparent opacity={0.1}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Magic rune circle on ground — appears at very high calm
function MagicRuneCircle({ calmLevel }: { calmLevel: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const opacityRef = useRef(0)

  const ringGeos = useMemo(() => [
    new THREE.TorusGeometry(2.5, 0.015, 4, 64),
    new THREE.TorusGeometry(2.0, 0.012, 4, 64),
    new THREE.TorusGeometry(1.4, 0.01, 4, 48),
  ], [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const targetOp = Math.max(0, (calmLevel - 70) / 30)
    opacityRef.current += (targetOp - opacityRef.current) * delta * 0.8

    const op = opacityRef.current
    groupRef.current.visible = op > 0.005
    groupRef.current.rotation.y = t * 0.04

    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      if (!mesh.material) return
      const speed = [0.04, -0.06, 0.09][i] || 0.04
      child.rotation.z = t * speed
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = op * (0.18 - i * 0.04)
    })
  })

  return (
    <group ref={groupRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      {ringGeos.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshBasicMaterial
            color={i === 0 ? '#a78bfa' : i === 1 ? '#60a5fa' : '#34d399'}
            transparent opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

export function GameScene({
  onBubblePopped, onStoneCollected, onChime,
  calmLevel, raining, lanterns,
}: GameSceneProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') e.preventDefault()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const fogColor = raining ? '#040710' : '#05091a'
  const ambientIntensity = raining ? 0.18 : 0.32

  // Bloom strength scales with calmLevel
  const bloomIntensity = 0.4 + (calmLevel / 100) * 0.6
  const bloomThreshold = raining ? 0.55 : 0.45

  return (
    <Canvas
      camera={{ position: [0, 3.5, 11], fov: 52 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <color attach="background" args={[fogColor]} />
        <fog attach="fog" args={[fogColor, 20, 48]} />

        <ambientLight intensity={ambientIntensity} color="#9ba8c8" />
        <directionalLight position={[5, 12, 5]} intensity={raining ? 0.25 : 0.5} color="#d4c5ff" castShadow />
        <pointLight position={[-4, 4, -4]} intensity={0.28} color="#60a5fa" />
        <pointLight position={[4, 2, 4]} intensity={0.12} color="#a78bfa" />

        <Sky calmLevel={calmLevel} />
        <AtmosphericClouds raining={raining} />
        <VolumetricLight raining={raining} />
        <GroundMist />
        <CameraBreath calmLevel={calmLevel} />

        <FloatingIsland calmLevel={calmLevel} />
        <AnxietyBubbles onBubblePopped={onBubblePopped} />
        <ParticleField calmLevel={calmLevel} />
        <ZenGarden calmLevel={calmLevel} />
        <Fireflies calmLevel={calmLevel} />
        <MeditationStones onCollect={onStoneCollected} calmLevel={calmLevel} />
        <WishLanterns lanterns={lanterns} />
        <WindChimes onChime={onChime} />
        <FloatingWords calmLevel={calmLevel} />
        <RainSystem active={raining} />
        <SpiritOrbs calmLevel={calmLevel} />
        <MagicRuneCircle calmLevel={calmLevel} />

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={bloomThreshold}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette
            offset={0.3}
            darkness={raining ? 0.7 : 0.45}
            blendFunction={BlendFunction.NORMAL}
          />
          <ChromaticAberration
            offset={new THREE.Vector2(0.0005, 0.0005)}
            radialModulation={false}
            modulationOffset={0}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0.2}
          autoRotate
          autoRotateSpeed={0.22}
          dampingFactor={0.05}
          enableDamping
        />
      </Suspense>
    </Canvas>
  )
}
