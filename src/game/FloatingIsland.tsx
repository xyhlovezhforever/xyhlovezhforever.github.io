import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FloatingIslandProps {
  calmLevel: number
}

function fbm(x: number, y: number): number {
  let v = 0, a = 0.5, f = 1
  for (let i = 0; i < 4; i++) {
    const n = Math.sin(x * f * 127.1 + y * f * 311.7) * 43758.5453
    v += a * (n - Math.floor(n))
    f *= 2; a *= 0.5
  }
  return v
}

export function FloatingIsland({ calmLevel }: FloatingIslandProps) {
  const groupRef = useRef<THREE.Group>(null)
  const waterRef = useRef<THREE.Mesh>(null)
  const waterfallRef = useRef<THREE.Points>(null)
  const waterRippleRef = useRef<THREE.Mesh>(null)
  const mossGlowRef = useRef<THREE.Mesh>(null)

  const islandGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(3.5, 2.2, 2, 32, 6)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const t = calmLevel / 100
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const dist = Math.sqrt(x * x + z * z)
      const angle = Math.atan2(z, x)
      if (y > 0.5) {
        const terrain = fbm(x * 0.8, z * 0.8) * 0.5 + Math.sin(angle * 3) * 0.06
        pos.setY(i, y + terrain)
        const g = 0.3 + terrain * 0.3 + t * 0.15
        colors[i * 3] = 0.16 + terrain * 0.08
        colors[i * 3 + 1] = g
        colors[i * 3 + 2] = 0.14
      } else if (y > -0.3) {
        const cliff = fbm(x * 2 + 10, z * 2 + 10) * 0.15
        colors[i * 3] = 0.32 + cliff * 0.12
        colors[i * 3 + 1] = 0.23 + cliff * 0.08
        colors[i * 3 + 2] = 0.17
      } else {
        const rocky = fbm(x * 3, z * 3) * 0.25
        pos.setX(i, x * (0.6 + rocky * 0.35))
        pos.setZ(i, z * (0.6 + rocky * 0.35))
        pos.setY(i, y - dist * 0.3 + rocky * 0.4)
        colors[i * 3] = 0.26 + rocky * 0.08
        colors[i * 3 + 1] = 0.24 + rocky * 0.06
        colors[i * 3 + 2] = 0.3 + rocky * 0.1
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [calmLevel])

  const bottomGeo = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(2, 1)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (y > 0) pos.setY(i, y * 0.3)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  // Water surface with ripple vertices
  const pondGeo = useMemo(() => {
    return new THREE.CircleGeometry(0.65, 32, 0, Math.PI * 2)
  }, [])

  const waterfallData = useMemo(() => {
    const count = 100
    const positions = new Float32Array(count * 3)
    const speeds: number[] = []
    const offsets: number[] = []
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 2.5 + (Math.random() - 0.5) * 0.3
      positions[i * 3 + 1] = 0.5 - Math.random() * 3
      positions[i * 3 + 2] = -0.8 + (Math.random() - 0.5) * 0.3
      speeds.push(0.018 + Math.random() * 0.022)
      offsets.push(Math.random() * Math.PI * 2)
    }
    return { positions, speeds, offsets, count }
  }, [])

  const waterParticleTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    g.addColorStop(0, 'rgba(180,220,255,1)')
    g.addColorStop(0.5, 'rgba(150,200,255,0.5)')
    g.addColorStop(1, 'rgba(150,200,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 16)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.15
      groupRef.current.rotation.y = t * 0.015 // slow rotation of entire island
    }
    // Animated water surface ripples
    if (waterRef.current) {
      const pos = waterRef.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i)
        const dist = Math.sqrt(x * x + z * z)
        pos.setY(i, Math.sin(dist * 8 - t * 2.5) * 0.008 + Math.sin(dist * 5 + t * 1.8) * 0.005)
      }
      pos.needsUpdate = true
      ;(waterRef.current.material as THREE.MeshStandardMaterial).opacity = 0.55 + Math.sin(t * 1.2) * 0.08
    }
    // Water ripple ring pulse
    if (waterRippleRef.current) {
      const scale = 0.8 + Math.sin(t * 1.5) * 0.15
      waterRippleRef.current.scale.set(scale, scale, scale)
      ;(waterRippleRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(t * 1.5) * 0.04
    }
    // Moss glow pulse
    if (mossGlowRef.current) {
      ;(mossGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.03 + Math.sin(t * 0.7) * 0.015
    }
    if (waterfallRef.current) {
      const pos = waterfallRef.current.geometry.attributes.position
      for (let i = 0; i < waterfallData.count; i++) {
        ;(pos.array as Float32Array)[i * 3 + 1] -= waterfallData.speeds[i]
        // Slight horizontal drift from waterfall spray
        ;(pos.array as Float32Array)[i * 3] += Math.sin(t * 3 + waterfallData.offsets[i]) * 0.001
        if ((pos.array[i * 3 + 1] as number) < -3) {
          ;(pos.array as Float32Array)[i * 3 + 1] = 0.5
          ;(pos.array as Float32Array)[i * 3] = 2.5 + (Math.random() - 0.5) * 0.3
          ;(pos.array as Float32Array)[i * 3 + 2] = -0.8 + (Math.random() - 0.5) * 0.3
        }
      }
      pos.needsUpdate = true
    }
  })

  return (
    <group ref={groupRef}>
      {/* Island terrain */}
      <mesh geometry={islandGeo} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} flatShading />
      </mesh>

      {/* Bottom rock */}
      <mesh geometry={bottomGeo} position={[0, -1.5, 0]}>
        <meshStandardMaterial color="#3d3d50" roughness={0.95} flatShading />
      </mesh>

      {/* Ambient moss glow on island underside */}
      <mesh ref={mossGlowRef} position={[0, -0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 24]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.03} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Crystals */}
      {[
        { p: [0.5, -2.2, 0.3], r: [0.2, 0, 0.1], s: 0.5, c: '#a78bfa' },
        { p: [-0.8, -2, -0.5], r: [-0.1, 0.3, -0.2], s: 0.4, c: '#818cf8' },
        { p: [0.2, -2.5, -0.8], r: [0.15, -0.2, 0.3], s: 0.7, c: '#c084fc' },
        { p: [-0.3, -1.9, 0.7], r: [-0.3, 0.1, 0.2], s: 0.35, c: '#7c3aed' },
        { p: [1, -2.3, -0.2], r: [0, 0.5, -0.1], s: 0.45, c: '#a5b4fc' },
        { p: [0, -2.6, 0.5], r: [-0.2, 0.4, 0], s: 0.6, c: '#e879f9' },
        { p: [-1.2, -2.1, 0.3], r: [0.1, -0.3, 0.2], s: 0.3, c: '#60a5fa' },
        { p: [0.8, -1.8, 0.9], r: [-0.15, 0.2, -0.1], s: 0.38, c: '#34d399' },
      ].map((crystal, i) => (
        <CrystalShard key={i} crystal={crystal} index={i} />
      ))}

      {/* Animated pond with ripples */}
      <mesh ref={waterRef} geometry={pondGeo} position={[1.2, 0.82, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#4a90d9" transparent opacity={0.55} metalness={0.9} roughness={0.02} envMapIntensity={1} />
      </mesh>
      {/* Pond ripple ring */}
      <mesh ref={waterRippleRef} position={[1.2, 0.825, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.65, 24]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Pond glow reflection */}
      <mesh position={[1.2, 0.818, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Waterfall particles */}
      <points ref={waterfallRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[waterfallData.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={waterParticleTex} size={0.04} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>

      {/* Waterfall rock ledge */}
      <mesh position={[2.5, 0.6, -0.8]} rotation={[0.2, 0, 0.1]}>
        <boxGeometry args={[0.4, 0.12, 0.15]} />
        <meshStandardMaterial color="#5a5a70" roughness={0.9} flatShading />
      </mesh>
      {/* Waterfall mist glow */}
      <mesh position={[2.5, -1.5, -0.8]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial color="#bfdbfe" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Trees */}
      <PineTree position={[-1.5, 0.8, -1]} scale={0.85} />
      <PineTree position={[0.3, 0.85, 1.5]} scale={0.65} />
      <RoundTree position={[2.2, 0.7, 0.5]} scale={0.55} />
      <CherryTree position={[-0.3, 0.8, -2]} scale={0.55} calmLevel={calmLevel} />
      <BambooCluster position={[-2.5, 0.75, -0.5]} />

      {/* Rocks */}
      {[
        [2.8, 0.5, -0.8, 0.3], [-2.5, 0.45, 0.8, 0.25],
        [0, 0.55, -2.8, 0.28], [2.5, 0.5, 1.2, 0.18],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i * 1.2, i * 0.8, i * 0.3]}>
          <dodecahedronGeometry args={[s as number, 0]} />
          <meshStandardMaterial color="#6b7280" roughness={0.92} flatShading />
        </mesh>
      ))}

      {/* Mushroom clusters */}
      {[
        { pos: [-2, 0.65, 0.2], c: '#c084fc' },
        { pos: [1.5, 0.72, -1.5], c: '#60a5fa' },
        { pos: [0.8, 0.7, 1.8], c: '#f472b6' },
      ].map((cluster, ci) => (
        <group key={ci} position={cluster.pos as [number, number, number]}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.012, 0.018, 0.08, 4]} />
            <meshStandardMaterial color="#e8d5b7" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.035, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={cluster.c} emissive={cluster.c} emissiveIntensity={0.5} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.05, 0.03, 0.04]}>
            <cylinderGeometry args={[0.009, 0.013, 0.06, 4]} />
            <meshStandardMaterial color="#e8d5b7" />
          </mesh>
          <mesh position={[0.05, 0.08, 0.04]}>
            <sphereGeometry args={[0.026, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={cluster.c} emissive={cluster.c} emissiveIntensity={0.4} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* Torii gate */}
      <ToriiGate position={[-1, 0.75, 0]} />

      {/* Stone lantern */}
      <StoneLantern position={[1.8, 0.75, 1.2]} />

      {/* Stone path */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 0.7 - 0.3
        const r = 1.2 + i * 0.22
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0.76, Math.sin(angle) * r]} rotation={[-Math.PI / 2, 0, angle]}>
            <circleGeometry args={[0.12, 5]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.95} flatShading />
          </mesh>
        )
      })}

      {/* Small flowers around path */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2 + 0.5
        const r = 2.5 + (i % 2) * 0.4
        const x = Math.cos(angle) * r
        const z = Math.sin(angle) * r
        const colors = ['#f472b6', '#fbbf24', '#60a5fa', '#a78bfa', '#34d399', '#fb923c']
        return <SmallFlower key={i} position={[x, 0.78, z]} color={colors[i]} index={i} />
      })}
    </group>
  )
}

function CrystalShard({ crystal, index }: { crystal: any; index: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ;(ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(t * 0.8 + index) * 0.15
  })
  return (
    <mesh
      ref={ref}
      position={crystal.p as [number, number, number]}
      rotation={crystal.r as [number, number, number]}
      scale={[0.08, crystal.s, 0.08]}
    >
      <cylinderGeometry args={[0.5, 0, 1, 5]} />
      <meshStandardMaterial
        color={crystal.c}
        emissive={crystal.c}
        emissiveIntensity={0.35}
        transparent
        opacity={0.7}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  )
}

function SmallFlower({ position, color, index }: { position: [number, number, number]; color: string; index: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.2 + index * 1.3) * 0.08
  })
  return (
    <group ref={ref} position={position} scale={0.6}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.008, 0.012, 0.12, 4]} />
        <meshStandardMaterial color="#2d6a4f" />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.03, 0.14, Math.sin(a) * 0.03]} rotation={[0.4, a, 0]}>
            <sphereGeometry args={[0.022, 5, 4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
          </mesh>
        )
      })}
    </group>
  )
}

function BambooCluster({ position }: { position: [number, number, number] }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((r, i) => {
      if (r) r.rotation.z = Math.sin(t * 1.2 + i * 1.4) * 0.025
    })
  })
  return (
    <group position={position}>
      {[0, 0.12, -0.1, 0.06, -0.05].map((ox, i) => (
        <group key={i} ref={el => { refs.current[i] = el }} position={[ox, 0, i * 0.08 - 0.15]}>
          {Array.from({ length: 5 }).map((_, s) => (
            <mesh key={s} position={[0, s * 0.2 + 0.1, 0]}>
              <cylinderGeometry args={[0.012, 0.014, 0.22, 5]} />
              <meshStandardMaterial color={`hsl(${115 + s * 5}, 55%, ${30 + s * 4}%)`} />
            </mesh>
          ))}
          {/* Leaves */}
          {[1, 2, 3].map((s) => (
            <mesh key={`l${s}`} position={[(i % 2 === 0 ? 1 : -1) * 0.06, s * 0.2, 0]} rotation={[0.3, 0, (i % 2 === 0 ? 0.4 : -0.4)]}>
              <planeGeometry args={[0.12, 0.04]} />
              <meshStandardMaterial color="#3d8b4e" side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function StoneLantern({ position }: { position: [number, number, number] }) {
  const glowRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (glowRef.current) {
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(state.clock.elapsedTime * 2.5) * 0.1
    }
  })
  return (
    <group position={position} scale={0.22}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.25, 8]} />
        <meshStandardMaterial color="#8a8a9a" roughness={0.9} />
      </mesh>
      {/* Shaft */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.35, 6]} />
        <meshStandardMaterial color="#7a7a8a" roughness={0.9} />
      </mesh>
      {/* Fire box */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.3, 0.28, 0.3]} />
        <meshStandardMaterial color="#6a6a7a" roughness={0.9} transparent opacity={0.8} />
      </mesh>
      {/* Glow inside */}
      <mesh ref={glowRef} position={[0, 0.55, 0]}>
        <boxGeometry args={[0.2, 0.18, 0.2]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0, 0.25, 0.18, 8]} />
        <meshStandardMaterial color="#5a5a6a" roughness={0.85} />
      </mesh>
    </group>
  )
}

function PineTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.012
  })
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 0.8, 5]} />
        <meshStandardMaterial color="#6b4423" roughness={0.95} />
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, 0.85 + i * 0.32, 0]}>
          <coneGeometry args={[0.45 - i * 0.1, 0.45, 6]} />
          <meshStandardMaterial color={`hsl(${145 + i * 8}, 50%, ${22 + i * 5}%)`} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function RoundTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6 + position[2]) * 0.01
  })
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.7, 5]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshStandardMaterial color="#2d8a4e" roughness={0.8} flatShading />
      </mesh>
      {/* Small secondary foliage spheres */}
      <mesh position={[0.2, 0.82, 0.1]}>
        <icosahedronGeometry args={[0.22, 1]} />
        <meshStandardMaterial color="#3a9a5a" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[-0.15, 0.85, -0.12]}>
        <icosahedronGeometry args={[0.18, 1]} />
        <meshStandardMaterial color="#1d7a3e" roughness={0.8} flatShading />
      </mesh>
    </group>
  )
}

function CherryTree({ position, scale = 1, calmLevel }: {
  position: [number, number, number]; scale?: number; calmLevel: number
}) {
  const petalRef = useRef<THREE.Points>(null)
  const petalCount = Math.floor((calmLevel / 100) * 40)
  const branchRef = useRef<THREE.Group>(null)

  const petalData = useMemo(() => {
    const pos = new Float32Array(40 * 3)
    const vel = new Float32Array(40 * 3)
    for (let i = 0; i < 40; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2
      pos[i * 3 + 1] = Math.random() * 2.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2
      vel[i * 3] = (Math.random() - 0.5) * 0.008
      vel[i * 3 + 1] = -0.006 - Math.random() * 0.006
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.008
    }
    return { pos, vel }
  }, [])

  const petalTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d')!
    ctx.fillStyle = 'rgba(251,182,206,1)'
    ctx.beginPath()
    ctx.arc(8, 8, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(249,168,212,0.4)'
    ctx.beginPath()
    ctx.arc(8, 6, 4, 0, Math.PI)
    ctx.fill()
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state) => {
    if (!petalRef.current) return
    const pos = petalRef.current.geometry.attributes.position
    const t = state.clock.elapsedTime
    for (let i = 0; i < petalCount; i++) {
      ;(pos.array as Float32Array)[i * 3] += petalData.vel[i * 3] + Math.sin(t * 0.5 + i) * 0.003
      ;(pos.array as Float32Array)[i * 3 + 1] += petalData.vel[i * 3 + 1]
      ;(pos.array as Float32Array)[i * 3 + 2] += petalData.vel[i * 3 + 2]
      if ((pos.array[i * 3 + 1] as number) < -0.5) {
        ;(pos.array as Float32Array)[i * 3 + 1] = 2.0 + Math.random() * 0.5
        ;(pos.array as Float32Array)[i * 3] = (Math.random() - 0.5) * 2
        ;(pos.array as Float32Array)[i * 3 + 2] = (Math.random() - 0.5) * 2
      }
    }
    pos.needsUpdate = true
    if (branchRef.current) branchRef.current.rotation.z = Math.sin(t * 0.7) * 0.015
  })

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.07, 0.8, 5]} />
        <meshStandardMaterial color="#6b3a2a" roughness={0.9} />
      </mesh>
      {/* Main canopy */}
      <mesh position={[0, 1, 0]}>
        <icosahedronGeometry args={[0.38, 1]} />
        <meshStandardMaterial color="#f9a8d4" emissive="#f472b6" emissiveIntensity={0.12} roughness={0.7} flatShading transparent opacity={0.85} />
      </mesh>
      {/* Secondary blossoms */}
      <group ref={branchRef}>
        <mesh position={[0.3, 0.9, 0.1]}>
          <icosahedronGeometry args={[0.22, 1]} />
          <meshStandardMaterial color="#fbcfe8" emissive="#ec4899" emissiveIntensity={0.1} roughness={0.7} flatShading transparent opacity={0.8} />
        </mesh>
        <mesh position={[-0.25, 0.95, -0.15]}>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial color="#fce7f3" emissive="#f472b6" emissiveIntensity={0.1} roughness={0.7} flatShading transparent opacity={0.75} />
        </mesh>
      </group>
      {petalCount > 0 && (
        <points ref={petalRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[petalData.pos.slice(0, petalCount * 3), 3]} count={petalCount} />
          </bufferGeometry>
          <pointsMaterial map={petalTex} size={0.045} transparent opacity={0.65} depthWrite={false} sizeAttenuation />
        </points>
      )}
    </group>
  )
}

function ToriiGate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.25, 0]}>
          <cylinderGeometry args={[0.02, 0.025, 0.5, 6]} />
          <meshStandardMaterial color="#c0392b" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.55, 0.025, 0.035]} />
        <meshStandardMaterial color="#c0392b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.6, 0.02, 0.04]} />
        <meshStandardMaterial color="#a93226" roughness={0.7} />
      </mesh>
      {/* Small shimmer on gate */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.62, 0.03, 0.045]} />
        <meshBasicMaterial color="#e8594a" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
