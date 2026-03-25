import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SkyProps {
  calmLevel?: number
}

// Constellation definitions: pairs of star indices
const CONSTELLATIONS = [
  // Big Dipper-like
  [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7]],
  // Orion-like
  [[8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [10, 14], [9, 15]],
  // Small triangle
  [[16, 17], [17, 18], [18, 16]],
]

const CONSTELLATION_STAR_POSITIONS: [number, number, number][] = [
  // Big Dipper
  [-8, 22, -28], [-6, 23, -28], [-4, 23.5, -28], [-2, 23, -28],
  [0, 22.5, -28], [1, 21, -28], [2, 20, -28], [-1, 25, -28],
  // Orion
  [6, 18, -28], [8, 19.5, -28], [10, 21, -28], [12, 20, -28],
  [14, 18.5, -28], [13, 17, -28], [11, 22.5, -28], [9, 17.5, -28],
  // Triangle
  [-12, 18, -28], [-10, 20, -28], [-8, 17.5, -28],
]

export function Sky({ calmLevel = 0 }: SkyProps) {
  const starsRef = useRef<THREE.Points>(null)
  const auroraRef = useRef<THREE.Mesh>(null)
  const aurora2Ref = useRef<THREE.Mesh>(null)
  const aurora3Ref = useRef<THREE.Mesh>(null)
  const nebulaRef = useRef<THREE.Mesh>(null)
  const constellationRef = useRef<THREE.LineSegments>(null)

  const starCount = 900
  const { starPositions, starColors } = useMemo(() => {
    const pos = new Float32Array(starCount * 3)
    const col = new Float32Array(starCount * 3)
    const _sizes = new Float32Array(starCount)
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 28 + Math.random() * 18
      pos[i3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i3 + 1] = Math.abs(r * Math.cos(phi)) + 3
      pos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const c = Math.random()
      if (c < 0.45) { col[i3] = 0.9; col[i3 + 1] = 0.92; col[i3 + 2] = 1 }
      else if (c < 0.65) { col[i3] = 0.7; col[i3 + 1] = 0.8; col[i3 + 2] = 1 }
      else if (c < 0.8) { col[i3] = 1; col[i3 + 1] = 0.9; col[i3 + 2] = 0.8 }
      else if (c < 0.92) { col[i3] = 0.8; col[i3 + 1] = 0.95; col[i3 + 2] = 0.8 } // greenish
      else { col[i3] = 1; col[i3 + 1] = 0.75; col[i3 + 2] = 0.7 } // reddish giant
      _sizes[i] = 0.5 + Math.random() * 1.5 // varied sizes
    }
    return { starPositions: pos, starColors: col }
  }, [])

  // Twinkling via opacity refs

  const starTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.15, 'rgba(240,248,255,0.9)')
    g.addColorStop(0.4, 'rgba(220,230,255,0.5)')
    g.addColorStop(1, 'rgba(200,220,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
    // 4-point diffraction spike
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(16, 30); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(2, 16); ctx.lineTo(30, 16); ctx.stroke()
    return new THREE.CanvasTexture(c)
  }, [])

  // Nebula texture
  const nebulaTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    // Multi-layer soft clouds
    const colors = [
      { h: 260, s: 60, l: 40 }, { h: 200, s: 70, l: 35 }, { h: 300, s: 50, l: 38 }
    ]
    colors.forEach(({ h, s, l }, idx) => {
      const cx = 80 + idx * 50, cy = 100 + idx * 30
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 + idx * 20)
      g.addColorStop(0, `hsla(${h},${s}%,${l}%,0.18)`)
      g.addColorStop(0.4, `hsla(${h},${s}%,${l}%,0.08)`)
      g.addColorStop(1, `hsla(${h},${s}%,${l}%,0)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 256, 256)
    })
    return new THREE.CanvasTexture(c)
  }, [])

  // Constellation lines geometry
  const constellationGeo = useMemo(() => {
    const allVertices: number[] = []
    CONSTELLATIONS.forEach((constell) => {
      constell.forEach(([a, b]) => {
        const pa = CONSTELLATION_STAR_POSITIONS[a]
        const pb = CONSTELLATION_STAR_POSITIONS[b]
        allVertices.push(...pa, ...pb)
      })
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allVertices), 3))
    return geo
  }, [])

  // Shooting star state
  const shootingStarRef = useRef<THREE.Mesh>(null)
  const ssState = useRef({ active: false, progress: 0, speed: 1, startX: 0, startY: 15, dirX: -1, dirY: -0.3 })
  const ss2Ref = useRef<THREE.Mesh>(null)
  const ss2State = useRef({ active: false, progress: 0, speed: 1, startX: 0, startY: 15, dirX: -1, dirY: -0.3 })

  // Moon shimmer ref
  const moonGlowRef = useRef<THREE.Mesh>(null)
  const moonHaloRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (starsRef.current) starsRef.current.rotation.y += 0.00002

    // Aurora wave - more complex multi-frequency wave
    if (auroraRef.current) {
      const pos = auroraRef.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = (pos.array as Float32Array)[i * 3]
        ;(pos.array as Float32Array)[i * 3 + 1] = Math.sin(x * 0.3 + t * 0.18) * 1.4
          + Math.sin(x * 0.7 + t * 0.35) * 0.5
          + Math.sin(x * 0.15 + t * 0.12) * 0.8
        ;(pos.array as Float32Array)[i * 3 + 2] = Math.sin(x * 0.5 + t * 0.22) * 1.6
      }
      pos.needsUpdate = true
      ;(auroraRef.current.material as THREE.MeshBasicMaterial).opacity = 0.055 + Math.sin(t * 0.18) * 0.025
    }

    if (aurora2Ref.current) {
      const pos = aurora2Ref.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = (pos.array as Float32Array)[i * 3]
        ;(pos.array as Float32Array)[i * 3 + 1] = Math.sin(x * 0.4 + t * 0.22 + 1.2) * 1.0 + Math.sin(x * 0.9 + t * 0.45) * 0.35
      }
      pos.needsUpdate = true
      ;(aurora2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.035 + Math.sin(t * 0.25 + 1) * 0.015
    }

    // Third aurora — cyan, faster oscillation
    if (aurora3Ref.current) {
      const pos = aurora3Ref.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = (pos.array as Float32Array)[i * 3]
        ;(pos.array as Float32Array)[i * 3 + 1] = Math.sin(x * 0.55 + t * 0.28 + 2.5) * 1.2
          + Math.sin(x * 1.1 + t * 0.52 + 1) * 0.45
          + Math.sin(x * 0.2 + t * 0.15) * 0.6
        ;(pos.array as Float32Array)[i * 3 + 2] = Math.cos(x * 0.35 + t * 0.18) * 1.2
      }
      pos.needsUpdate = true
      ;(aurora3Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.028 + Math.sin(t * 0.3 + 2) * 0.012
    }

    // Nebula slow drift
    if (nebulaRef.current) {
      nebulaRef.current.rotation.z = Math.sin(t * 0.02) * 0.02
      ;(nebulaRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 0.1) * 0.02
    }

    // Constellation fade in with calmLevel
    if (constellationRef.current) {
      const targetAlpha = Math.min(1, calmLevel / 80) * 0.18
      ;(constellationRef.current.material as THREE.LineBasicMaterial).opacity += (targetAlpha - (constellationRef.current.material as THREE.LineBasicMaterial).opacity) * 0.01
    }

    // Moon shimmer
    if (moonGlowRef.current) {
      ;(moonGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * 0.5) * 0.02
    }
    if (moonHaloRef.current) {
      moonHaloRef.current.scale.setScalar(1 + Math.sin(t * 0.35) * 0.04)
      ;(moonHaloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.035 + Math.sin(t * 0.35) * 0.015
    }

    // Shooting star 1
    const ss = ssState.current
    if (shootingStarRef.current) {
      if (ss.active) {
        ss.progress += 0.014 * ss.speed
        shootingStarRef.current.position.set(
          ss.startX + ss.dirX * ss.progress * 22,
          ss.startY + ss.dirY * ss.progress * 22,
          -20
        )
        // Rotate to match direction
        shootingStarRef.current.rotation.z = Math.atan2(ss.dirY, ss.dirX)
        const mat = shootingStarRef.current.material as THREE.MeshBasicMaterial
        mat.opacity = ss.progress < 0.15 ? ss.progress * 5 : Math.max(0, 1 - (ss.progress - 0.15) * 1.6)
        shootingStarRef.current.visible = true
        if (ss.progress > 1) { ss.active = false; shootingStarRef.current.visible = false }
      } else if (Math.random() < 0.0025) {
        ss.active = true; ss.progress = 0
        ss.speed = 0.6 + Math.random() * 1.8
        ss.startX = (Math.random() - 0.5) * 35; ss.startY = 16 + Math.random() * 8
        ss.dirX = -0.5 - Math.random(); ss.dirY = -0.2 - Math.random() * 0.4
      }
    }

    // Shooting star 2 (appears less frequently)
    const ss2 = ss2State.current
    if (ss2Ref.current) {
      if (ss2.active) {
        ss2.progress += 0.018 * ss2.speed
        ss2Ref.current.position.set(
          ss2.startX + ss2.dirX * ss2.progress * 18,
          ss2.startY + ss2.dirY * ss2.progress * 18,
          -22
        )
        ss2Ref.current.rotation.z = Math.atan2(ss2.dirY, ss2.dirX)
        const mat = ss2Ref.current.material as THREE.MeshBasicMaterial
        mat.opacity = ss2.progress < 0.12 ? ss2.progress * 6 : Math.max(0, 1 - (ss2.progress - 0.12) * 2)
        ss2Ref.current.visible = true
        if (ss2.progress > 1) { ss2.active = false; ss2Ref.current.visible = false }
      } else if (Math.random() < 0.0008) {
        ss2.active = true; ss2.progress = 0
        ss2.speed = 0.8 + Math.random() * 1.2
        ss2.startX = (Math.random() - 0.5) * 30; ss2.startY = 14 + Math.random() * 10
        ss2.dirX = 0.3 + Math.random() * 0.8; ss2.dirY = -0.15 - Math.random() * 0.35
      }
    }
  })

  return (
    <group>
      {/* Stars with varied sizes */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[starColors, 3]} />
        </bufferGeometry>
        <pointsMaterial map={starTex} size={0.14} transparent opacity={0.88} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation vertexColors />
      </points>

      {/* Nebula cloud */}
      <mesh ref={nebulaRef} position={[8, 20, -32]} rotation={[-0.1, 0.3, 0.15]}>
        <planeGeometry args={[22, 16, 1, 1]} />
        <meshBasicMaterial map={nebulaTex} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Second nebula patch */}
      <mesh position={[-15, 17, -30]} rotation={[-0.05, -0.2, -0.1]}>
        <planeGeometry args={[18, 12, 1, 1]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Constellation lines */}
      <lineSegments ref={constellationRef} geometry={constellationGeo}>
        <lineBasicMaterial color="#e0e8ff" transparent opacity={0} depthWrite={false} />
      </lineSegments>

      {/* Constellation star dots */}
      {CONSTELLATION_STAR_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.06, 4, 4]} />
          <meshBasicMaterial color="#e8f0ff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}

      {/* Primary aurora */}
      <mesh ref={auroraRef} position={[0, 14, -18]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[38, 9, 44, 14]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Secondary aurora */}
      <mesh ref={aurora2Ref} position={[5, 13.5, -20]} rotation={[-0.32, 0.15, 0.04]}>
        <planeGeometry args={[28, 7, 30, 10]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Third aurora ribbon - cyan animated */}
      <mesh ref={aurora3Ref} position={[-8, 15, -22]} rotation={[-0.25, -0.12, 0.03]}>
        <planeGeometry args={[24, 5, 28, 10]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.028} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Moon */}
      <mesh position={[-10, 16, -25]}>
        <sphereGeometry args={[2, 24, 24]} />
        <meshBasicMaterial color="#f0eaf8" />
      </mesh>
      {/* Moon surface detail (crater-like darker patch) */}
      <mesh position={[-10.5, 16.8, -23.1]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial color="#d8cde8" transparent opacity={0.4} />
      </mesh>
      <mesh position={[-9.2, 15.5, -23.1]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial color="#d5c8e5" transparent opacity={0.35} />
      </mesh>
      {/* Moon inner glow */}
      <mesh ref={moonGlowRef} position={[-10, 16, -25]}>
        <sphereGeometry args={[2.3, 16, 16]} />
        <meshBasicMaterial color="#e8d5ff" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Moon outer halo */}
      <mesh ref={moonHaloRef} position={[-10, 16, -25]}>
        <sphereGeometry args={[4.5, 12, 12]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.035} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Moon corona ring */}
      <mesh position={[-10, 16, -24.8]} rotation={[0.1, 0, 0]}>
        <torusGeometry args={[3.0, 0.5, 6, 32]} />
        <meshBasicMaterial color="#d8c8f8" transparent opacity={0.015} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Shooting star 1 - elongated trail */}
      <mesh ref={shootingStarRef} visible={false}>
        <boxGeometry args={[0.8, 0.018, 0.018]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Shooting star 2 */}
      <mesh ref={ss2Ref} visible={false}>
        <boxGeometry args={[0.5, 0.012, 0.012]} />
        <meshBasicMaterial color="#e8d5ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Distant floating rocks - more of them */}
      {[
        [-12, 4, -14, 0.7], [14, 6, -16, 1], [10, 8, -20, 0.5],
        [-18, 7, -18, 0.6], [18, 5, -22, 0.8], [-8, 10, -24, 0.4],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]}>
          <dodecahedronGeometry args={[s as number, 0]} />
          <meshStandardMaterial color="#2a2a40" roughness={0.9} flatShading />
        </mesh>
      ))}

      {/* Dim background galaxy band */}
      <mesh position={[0, 12, -35]} rotation={[-0.5, 0.3, 0.8]}>
        <planeGeometry args={[80, 15, 1, 1]} />
        <meshBasicMaterial color="#8080c0" transparent opacity={0.012} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
