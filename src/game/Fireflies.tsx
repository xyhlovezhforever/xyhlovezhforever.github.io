import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FirefliesProps {
  calmLevel: number
}

const MAX_FIREFLIES = 25

export function Fireflies({ calmLevel }: FirefliesProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Per-firefly data
  const fireflyData = useMemo(() => {
    return Array.from({ length: MAX_FIREFLIES }, (_, i) => {
      const angle = (i / MAX_FIREFLIES) * Math.PI * 2 + Math.random() * 0.5
      const r = 0.8 + Math.random() * 4
      const baseX = Math.cos(angle) * r
      const baseY = 0.4 + Math.random() * 3
      const baseZ = Math.sin(angle) * r
      // Random Lissajous-like params for organic path
      const ax = 0.3 + Math.random() * 0.8
      const ay = 0.15 + Math.random() * 0.3
      const az = 0.3 + Math.random() * 0.8
      const fx = 0.18 + Math.random() * 0.35
      const fy = 0.25 + Math.random() * 0.4
      const fz = 0.14 + Math.random() * 0.3
      const px = Math.random() * Math.PI * 2
      const py = Math.random() * Math.PI * 2
      const pz = Math.random() * Math.PI * 2
      // Blink params
      const blinkSpeed = 0.8 + Math.random() * 2.5
      const blinkOffset = Math.random() * Math.PI * 2
      // Color: mostly warm gold/yellow, some green-gold
      const warm = Math.random() > 0.3
      const color = warm
        ? new THREE.Color(`hsl(${45 + Math.random() * 20}, 95%, 75%)`)
        : new THREE.Color(`hsl(${95 + Math.random() * 25}, 85%, 68%)`)
      return { baseX, baseY, baseZ, ax, ay, az, fx, fy, fz, px, py, pz, blinkSpeed, blinkOffset, color }
    })
  }, [])

  // Trail positions for each firefly (6 trail points)
  const TRAIL_LEN = 6
  const trailPositions = useMemo(() => {
    return Array.from({ length: MAX_FIREFLIES }, () => new Float32Array(TRAIL_LEN * 3))
  }, [])


  const trailTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    g.addColorStop(0, 'rgba(255,240,160,0.8)')
    g.addColorStop(1, 'rgba(255,200,80,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
    return new THREE.CanvasTexture(c)
  }, [])

  const visibleCount = Math.max(3, Math.floor((calmLevel / 100) * MAX_FIREFLIES))

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime

    groupRef.current.children.forEach((child, i) => {
      if (i >= visibleCount) { child.visible = false; return }
      child.visible = true

      const d = fireflyData[i]
      // Lissajous-inspired organic position
      const x = d.baseX + Math.sin(t * d.fx + d.px) * d.ax
      const y = d.baseY + Math.sin(t * d.fy + d.py) * d.ay
      const z = d.baseZ + Math.sin(t * d.fz + d.pz) * d.az

      child.position.set(x, y, z)

      // Blink
      const blink = Math.pow(Math.max(0, Math.sin(t * d.blinkSpeed + d.blinkOffset)), 2.5)
      const calmBoost = 0.5 + (calmLevel / 100) * 0.5

      const group = child as THREE.Group
      // Main glow sphere
      const mainMesh = group.children[0] as THREE.Mesh
      if (mainMesh) {
        mainMesh.scale.setScalar(0.06 + blink * 0.04)
        ;(mainMesh.material as THREE.MeshBasicMaterial).opacity = (0.3 + blink * 0.7) * calmBoost
      }
      // Outer halo
      const halo = group.children[1] as THREE.Mesh
      if (halo) {
        halo.scale.setScalar(0.12 + blink * 0.08)
        ;(halo.material as THREE.MeshBasicMaterial).opacity = blink * 0.15 * calmBoost
      }

      // Update trail
      const trail = trailPositions[i]
      for (let ti = TRAIL_LEN - 1; ti > 0; ti--) {
        trail[ti * 3] = trail[(ti - 1) * 3]
        trail[ti * 3 + 1] = trail[(ti - 1) * 3 + 1]
        trail[ti * 3 + 2] = trail[(ti - 1) * 3 + 2]
      }
      trail[0] = x; trail[1] = y; trail[2] = z

      // Trail points
      const trailPoints = group.children[2] as THREE.Points
      if (trailPoints) {
        const posAttr = trailPoints.geometry.attributes.position
        for (let ti = 0; ti < TRAIL_LEN; ti++) {
          ;(posAttr.array as Float32Array)[ti * 3] = trail[ti * 3]
          ;(posAttr.array as Float32Array)[ti * 3 + 1] = trail[ti * 3 + 1]
          ;(posAttr.array as Float32Array)[ti * 3 + 2] = trail[ti * 3 + 2]
        }
        posAttr.needsUpdate = true
        ;(trailPoints.material as THREE.PointsMaterial).opacity = blink * 0.35 * calmBoost
      }
    })
  })

  return (
    <group ref={groupRef}>
      {fireflyData.map((d, i) => {
        const trailGeo = new THREE.BufferGeometry()
        trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_LEN * 3), 3))
        return (
          <group key={i} visible={i < 3}>
            {/* Main glow */}
            <mesh>
              <sphereGeometry args={[1, 6, 6]} />
              <meshBasicMaterial color={d.color} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Outer halo */}
            <mesh>
              <sphereGeometry args={[1, 6, 6]} />
              <meshBasicMaterial color={d.color} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Trail */}
            <points geometry={trailGeo}>
              <pointsMaterial map={trailTex} size={0.05} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation color={d.color} />
            </points>
          </group>
        )
      })}
    </group>
  )
}
