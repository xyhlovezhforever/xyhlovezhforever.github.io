import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ZenGardenProps {
  calmLevel: number
}

export function ZenGarden({ calmLevel }: ZenGardenProps) {
  const flowerCount = Math.floor(calmLevel / 10)

  const flowerData = useMemo(() => {
    const types = ['sakura', 'lotus', 'daisy', 'rose', 'tulip', 'sunflower', 'iris', 'lavender', 'poppy', 'lily']
    const colors = [
      '#f472b6', '#e879f9', '#fbbf24', '#f87171', '#fb923c',
      '#facc15', '#818cf8', '#c084fc', '#f43f5e', '#34d399',
    ]
    const positions: [number, number, number][] = []
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + 0.3
      const radius = 1.2 + (i % 4) * 0.35
      positions.push([Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius])
    }
    return positions.map((pos, i) => ({
      pos, color: colors[i], type: types[i], delay: i * 0.22,
    }))
  }, [])

  return (
    <group>
      {flowerData.slice(0, flowerCount).map((d, i) => (
        <Flower key={i} position={d.pos} color={d.color} type={d.type} delay={d.delay} index={i} />
      ))}
      {calmLevel > 50 && <Butterfly offset={0} colorIdx={0} />}
      {calmLevel > 80 && <Butterfly offset={3} colorIdx={1} />}
      {calmLevel > 95 && <Butterfly offset={6} colorIdx={2} />}
      {/* Floating petal particles when calm */}
      {calmLevel > 60 && <FloatingPetals calmLevel={calmLevel} />}
    </group>
  )
}

function Flower({ position, color, type, delay, index }: {
  position: [number, number, number]; color: string; type: string; delay: number; index: number
}) {
  const ref = useRef<THREE.Group>(null)
  const scaleRef = useRef(0)
  const petalRefs = useRef<THREE.Mesh[]>([])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    if (scaleRef.current < 1) scaleRef.current = Math.min(1, scaleRef.current + 0.012)
    ref.current.scale.setScalar(scaleRef.current)
    ref.current.rotation.z = Math.sin(t * 1.2 + delay) * 0.055

    // Petal gentle wave
    petalRefs.current.forEach((petal, i) => {
      if (petal) {
        petal.rotation.x = 0.2 + Math.sin(t * 1.5 + delay + i * 0.8) * 0.06
      }
    })
  })

  const petalCount = type === 'lotus' ? 8 : type === 'daisy' ? 12 : type === 'sunflower' ? 16 : 5
  const stemColor = type === 'lotus' ? '#4a7c59' : '#2d6a4f'
  const centerColor = type === 'sunflower' ? '#7c3a08' : type === 'daisy' ? '#fbbf24' : '#fbbf24'
  const petalRadius = type === 'daisy' || type === 'sunflower' ? 0.08 : 0.045
  const orbitRadius = type === 'daisy' || type === 'sunflower' ? 0.07 : 0.055
  const stemHeight = 0.18 + Math.abs(index % 4) * 0.04

  return (
    <group ref={ref} position={position} scale={0}>
      {/* Stem */}
      <mesh position={[0, stemHeight / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.013, stemHeight, 4]} />
        <meshStandardMaterial color={stemColor} roughness={0.8} />
      </mesh>
      {/* Leaf */}
      <mesh position={[0.04, stemHeight * 0.5, 0]} rotation={[0.4, 0, 0.5]}>
        <planeGeometry args={[0.1, 0.04]} />
        <meshStandardMaterial color={stemColor} side={THREE.DoubleSide} />
      </mesh>
      {/* Petals */}
      {Array.from({ length: petalCount }).map((_, i) => {
        const angle = (i / petalCount) * Math.PI * 2
        return (
          <mesh
            key={i}
            ref={(el: THREE.Mesh | null) => { if (el) petalRefs.current[i] = el }}
            position={[Math.cos(angle) * orbitRadius, stemHeight + 0.01, Math.sin(angle) * orbitRadius]}
            rotation={[0.25, angle, 0]}
          >
            {type === 'daisy' || type === 'sunflower'
              ? <planeGeometry args={[petalRadius * 2, petalRadius * 0.7]} />
              : <sphereGeometry args={[petalRadius, 5, 4]} />
            }
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.18}
              roughness={0.6}
              side={type === 'daisy' || type === 'sunflower' ? THREE.DoubleSide : undefined}
            />
          </mesh>
        )
      })}
      {/* Center */}
      <mesh position={[0, stemHeight + 0.015, 0]}>
        <sphereGeometry args={[0.022, 6, 6]} />
        <meshStandardMaterial color={centerColor} emissive={centerColor} emissiveIntensity={0.4} />
      </mesh>
      {/* Lotus: second row of petals */}
      {type === 'lotus' && Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2 + Math.PI / 6
        return (
          <mesh key={`inner${i}`} position={[Math.cos(angle) * 0.025, stemHeight + 0.018, Math.sin(angle) * 0.025]} rotation={[0.6, angle, 0]}>
            <sphereGeometry args={[0.028, 5, 4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} transparent opacity={0.85} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

function FloatingPetals({ calmLevel }: { calmLevel: number }) {
  const ref = useRef<THREE.Points>(null)
  const count = Math.floor((calmLevel - 60) / 40 * 20) + 5
  const data = useMemo(() => {
    const pos = new Float32Array(25 * 3)
    const vel = new Float32Array(25 * 3)
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2
      const r = 0.8 + Math.random() * 1.5
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = 0.6 + Math.random() * 2.5
      pos[i * 3 + 2] = Math.sin(angle) * r
      vel[i * 3] = (Math.random() - 0.5) * 0.006
      vel[i * 3 + 1] = -0.003 - Math.random() * 0.004
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.006
    }
    return { pos, vel }
  }, [])

  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    g.addColorStop(0, 'rgba(249,168,212,1)')
    g.addColorStop(0.5, 'rgba(236,72,153,0.6)')
    g.addColorStop(1, 'rgba(236,72,153,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      ;(pos.array as Float32Array)[i * 3] += data.vel[i * 3] + Math.sin(t * 0.4 + i * 0.9) * 0.003
      ;(pos.array as Float32Array)[i * 3 + 1] += data.vel[i * 3 + 1]
      ;(pos.array as Float32Array)[i * 3 + 2] += data.vel[i * 3 + 2] + Math.cos(t * 0.3 + i * 0.7) * 0.003
      if ((pos.array[i * 3 + 1] as number) < 0.5) {
        ;(pos.array as Float32Array)[i * 3 + 1] = 2.5 + Math.random() * 0.5
        ;(pos.array as Float32Array)[i * 3] = (Math.random() - 0.5) * 3
        ;(pos.array as Float32Array)[i * 3 + 2] = (Math.random() - 0.5) * 3
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos.slice(0, count * 3), 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={0.05} transparent opacity={0.55} depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Butterfly({ offset, colorIdx }: { offset: number; colorIdx: number }) {
  const ref = useRef<THREE.Group>(null)
  const wingLRef = useRef<THREE.Mesh>(null)
  const wingRRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Points>(null)
  const trailPos = useMemo(() => new Float32Array(12 * 3), [])

  const colors = ['#f472b6', '#60a5fa', '#a78bfa']
  const color = colors[colorIdx]

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + offset
    const x = Math.sin(t * 0.38) * 2.2
    const y = 1.5 + Math.sin(t * 0.75) * 0.45 + Math.cos(t * 0.5 + offset) * 0.2
    const z = Math.sin(t * 0.28) * Math.cos(t * 0.5) * 1.8
    ref.current.position.set(x, y, z)
    ref.current.rotation.y = Math.atan2(
      Math.cos(t * 0.38) * 2.2,
      Math.sin(t * 0.28) * Math.cos(t * 0.5) * 1.8
    )

    const flapSpeed = 8 + Math.sin(t * 0.5) * 2 // speed varies
    if (wingLRef.current) wingLRef.current.rotation.z = Math.sin(t * flapSpeed) * 0.55 + 0.3
    if (wingRRef.current) wingRRef.current.rotation.z = -Math.sin(t * flapSpeed) * 0.55 - 0.3

    // Trail
    if (trailRef.current) {
      const pos = trailRef.current.geometry.attributes.position
      for (let i = 11; i > 0; i--) {
        ;(pos.array as Float32Array)[i * 3] = (pos.array as Float32Array)[(i - 1) * 3]
        ;(pos.array as Float32Array)[i * 3 + 1] = (pos.array as Float32Array)[(i - 1) * 3 + 1]
        ;(pos.array as Float32Array)[i * 3 + 2] = (pos.array as Float32Array)[(i - 1) * 3 + 2]
      }
      ;(pos.array as Float32Array)[0] = x
      ;(pos.array as Float32Array)[1] = y
      ;(pos.array as Float32Array)[2] = z
      pos.needsUpdate = true
    }
  })

  const trailTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 8
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4)
    g.addColorStop(0, `${color}ff`)
    g.addColorStop(1, `${color}00`)
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 8)
    return new THREE.CanvasTexture(c)
  }, [color])

  return (
    <group ref={ref} scale={0.055}>
      {/* Body */}
      <mesh><capsuleGeometry args={[0.08, 0.38, 3, 6]} /><meshStandardMaterial color="#1a1a2e" roughness={0.5} /></mesh>
      {/* Antennae */}
      <mesh position={[0, 0.25, 0]} rotation={[0.1, 0, -0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.25, 3]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[0.1, 0, 0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.25, 3]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Wings */}
      <mesh ref={wingLRef} position={[-0.12, 0, 0]}>
        <planeGeometry args={[0.52, 0.38]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} side={THREE.DoubleSide} transparent opacity={0.78} />
      </mesh>
      <mesh ref={wingRRef} position={[0.12, 0, 0]}>
        <planeGeometry args={[0.52, 0.38]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} side={THREE.DoubleSide} transparent opacity={0.78} />
      </mesh>
      {/* Hind wings */}
      <mesh ref={wingLRef} position={[-0.09, -0.15, 0]} scale={[1, 0.7, 1]}>
        <planeGeometry args={[0.35, 0.28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} side={THREE.DoubleSide} transparent opacity={0.5} />
      </mesh>

      {/* Fairy dust trail */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPos, 3]} />
        </bufferGeometry>
        <pointsMaterial map={trailTex} size={8} transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  )
}
