import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  calmLevel: number
}

export function ParticleField({ calmLevel }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const innerRef = useRef<THREE.Points>(null)
  const spiralRef = useRef<THREE.Points>(null)

  const count = 380

  const { positions, colors, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const angle = Math.random() * Math.PI * 2
      const radius = 2.5 + Math.random() * 13
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = (Math.random() - 0.5) * 12
      positions[i3 + 2] = Math.sin(angle) * radius
      const c = Math.random()
      if (c < 0.25) { colors[i3] = 0.37; colors[i3 + 1] = 0.74; colors[i3 + 2] = 0.98 }
      else if (c < 0.5) { colors[i3] = 0.65; colors[i3 + 1] = 0.55; colors[i3 + 2] = 0.98 }
      else if (c < 0.7) { colors[i3] = 0.85; colors[i3 + 1] = 0.9; colors[i3 + 2] = 1 }
      else if (c < 0.85) { colors[i3] = 0.55; colors[i3 + 1] = 0.95; colors[i3 + 2] = 0.75 } // mint
      else { colors[i3] = 1; colors[i3 + 1] = 0.8; colors[i3 + 2] = 0.5 } // golden
      velocities[i] = 0.6 + Math.random() * 0.8
    }
    return { positions, colors, velocities }
  }, [])

  // Inner close ring of larger glowing particles
  const innerCount = 40
  const innerData = useMemo(() => {
    const pos = new Float32Array(innerCount * 3)
    const col = new Float32Array(innerCount * 3)
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2
      const r = 1.5 + (i % 4) * 0.3
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4
      pos[i * 3 + 2] = Math.sin(angle) * r
      // Warm/cool alternating
      const warm = i % 3 === 0
      col[i * 3] = warm ? 1 : 0.6; col[i * 3 + 1] = warm ? 0.85 : 0.7; col[i * 3 + 2] = warm ? 0.5 : 1
    }
    return { pos, col }
  }, [])

  // Spiral arm particles
  const spiralCount = 60
  const spiralData = useMemo(() => {
    const pos = new Float32Array(spiralCount * 3)
    const col = new Float32Array(spiralCount * 3)
    for (let i = 0; i < spiralCount; i++) {
      const t = i / spiralCount
      const angle = t * Math.PI * 6 // 3 full turns
      const r = 2 + t * 8
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = t * 4 - 2
      pos[i * 3 + 2] = Math.sin(angle) * r
      // Hue shift along spiral
      const hue = t * 280
      const [r2, g, b] = hslToRgb(hue / 360, 0.8, 0.75)
      col[i * 3] = r2; col[i * 3 + 1] = g; col[i * 3 + 2] = b
    }
    return { pos, col }
  }, [])

  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.8)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.3)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])

  const innerTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32)
    // Star diffraction
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(16, 28); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(4, 16); ctx.lineTo(28, 16); ctx.stroke()
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const calmFactor = 1 + calmLevel / 80
    const orbitSpeed = 0.0003 * calmFactor

    // Outer particles
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position
      const col = pointsRef.current.geometry.attributes.color
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const x = pos.array[i3] as number
        const z = pos.array[i3 + 2] as number
        const angle = Math.atan2(z, x) + orbitSpeed * velocities[i]
        const dist = Math.sqrt(x * x + z * z)
        ;(pos.array as Float32Array)[i3] = Math.cos(angle) * dist
        ;(pos.array as Float32Array)[i3 + 1] += Math.sin(t * 0.4 + i * 0.6) * 0.001
        ;(pos.array as Float32Array)[i3 + 2] = Math.sin(angle) * dist
        if ((pos.array[i3 + 1] as number) > 6) (pos.array as Float32Array)[i3 + 1] = -4
        if ((pos.array[i3 + 1] as number) < -4) (pos.array as Float32Array)[i3 + 1] = 6

        // Color shift with calmLevel: warm tones at low calm, cool at high calm
        if (calmLevel > 50) {
          const shift = (calmLevel - 50) / 50 * 0.3
          col.array[i3 + 2] = Math.min(1, (col.array[i3 + 2] as number) + shift * 0.01)
        }
      }
      pos.needsUpdate = true
      ;(pointsRef.current.material as THREE.PointsMaterial).opacity = 0.4 + (calmLevel / 100) * 0.25
    }

    // Inner ring - orbits faster, gentle bob
    if (innerRef.current) {
      const pos = innerRef.current.geometry.attributes.position
      for (let i = 0; i < innerCount; i++) {
        const x = pos.array[i * 3] as number
        const z = pos.array[i * 3 + 2] as number
        const angle = Math.atan2(z, x) + 0.001 * calmFactor
        const dist = Math.sqrt(x * x + z * z)
        ;(pos.array as Float32Array)[i * 3] = Math.cos(angle) * dist
        ;(pos.array as Float32Array)[i * 3 + 1] = (innerData.pos[i * 3 + 1]) + Math.sin(t * 1.2 + i * 0.5) * 0.25
        ;(pos.array as Float32Array)[i * 3 + 2] = Math.sin(angle) * dist
      }
      pos.needsUpdate = true
      ;(innerRef.current.material as THREE.PointsMaterial).opacity = 0.5 + Math.sin(t * 0.5) * 0.1
    }

    // Spiral - rotates as a whole
    if (spiralRef.current) {
      spiralRef.current.rotation.y = t * 0.05 * calmFactor
      spiralRef.current.rotation.x = Math.sin(t * 0.1) * 0.05
      ;(spiralRef.current.material as THREE.PointsMaterial).opacity = 0.18 + (calmLevel / 100) * 0.18
    }
  })

  return (
    <group>
      {/* Outer orbital particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.07} map={tex} vertexColors transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>

      {/* Inner close ring - brighter */}
      <points ref={innerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[innerData.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[innerData.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.1} map={innerTex} vertexColors transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>

      {/* Spiral arm */}
      <points ref={spiralRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[spiralData.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[spiralData.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.08} map={tex} vertexColors transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </group>
  )
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 1/6) { r = c; g = x } else if (h < 2/6) { r = x; g = c }
  else if (h < 3/6) { g = c; b = x } else if (h < 4/6) { g = x; b = c }
  else if (h < 5/6) { r = x; b = c } else { r = c; b = x }
  return [r + m, g + m, b + m]
}
