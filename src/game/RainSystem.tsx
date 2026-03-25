import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RainSystemProps {
  active: boolean
}

const RAIN_COUNT = 600
const SPLASH_COUNT = 60
const RIPPLE_COUNT = 24 // ground ripple rings

export function RainSystem({ active }: RainSystemProps) {
  const rainRef = useRef<THREE.Points>(null)
  const splashRef = useRef<THREE.Points>(null)
  const cloudRef = useRef<THREE.Group>(null)
  const rippleGroupRef = useRef<THREE.Group>(null)
  const fogPlaneRef = useRef<THREE.Mesh>(null)

  const opacityRef = useRef(0)
  const flashRef = useRef(0)
  const flashCooldown = useRef(8 + Math.random() * 12)

  // Rain drops
  const rainData = useMemo(() => {
    const positions = new Float32Array(RAIN_COUNT * 3)
    const speeds = new Float32Array(RAIN_COUNT)
    const windX = new Float32Array(RAIN_COUNT)
    const windZ = new Float32Array(RAIN_COUNT)
    for (let i = 0; i < RAIN_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26
      positions[i * 3 + 1] = Math.random() * 18
      positions[i * 3 + 2] = (Math.random() - 0.5) * 26
      speeds[i] = 0.14 + Math.random() * 0.1
      windX[i] = (Math.random() - 0.5) * 0.018
      windZ[i] = (Math.random() - 0.5) * 0.008
    }
    return { positions, speeds, windX, windZ }
  }, [])

  // Splashes
  const splashData = useMemo(() => {
    const positions = new Float32Array(SPLASH_COUNT * 3)
    const velocities = new Float32Array(SPLASH_COUNT * 3)
    const life = new Float32Array(SPLASH_COUNT)
    for (let i = 0; i < SPLASH_COUNT; i++) {
      positions[i * 3 + 1] = -20
      life[i] = 0
    }
    return { positions, velocities, life }
  }, [])
  const splashIdx = useRef(0)

  // Ground ripples
  const rippleData = useRef(
    Array.from({ length: RIPPLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 14,
      z: (Math.random() - 0.5) * 14,
      progress: Math.random(),
      active: false,
      speed: 0.8 + Math.random() * 0.4,
    }))
  )

  // Textures
  const rainTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 48
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(2, 0, 2, 48)
    g.addColorStop(0, 'rgba(140,175,230,0)')
    g.addColorStop(0.15, 'rgba(150,185,235,0.2)')
    g.addColorStop(0.6, 'rgba(170,200,245,0.55)')
    g.addColorStop(1, 'rgba(195,215,255,0.85)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 48)
    return new THREE.CanvasTexture(c)
  }, [])

  const splashTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    g.addColorStop(0, 'rgba(210,225,255,0.9)')
    g.addColorStop(0.5, 'rgba(185,205,240,0.35)')
    g.addColorStop(1, 'rgba(180,200,235,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state, delta) => {
    const targetOpacity = active ? 1 : 0
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 1.2)
    const op = opacityRef.current

    // Fog plane — wispy low-lying mist when raining
    if (fogPlaneRef.current) {
      ;(fogPlaneRef.current.material as THREE.MeshBasicMaterial).opacity = op * 0.055
      fogPlaneRef.current.visible = op > 0.02
    }

    // Cloud layer
    if (cloudRef.current) {
      cloudRef.current.visible = op > 0.01
      cloudRef.current.children.forEach((c, i) => {
        const mesh = c as THREE.Mesh
        if (mesh.material && 'opacity' in mesh.material) {
          ;(mesh.material as THREE.MeshBasicMaterial).opacity = op * (0.07 + i * 0.018)
        }
        c.position.x += Math.sin(state.clock.elapsedTime * 0.08 + i * 1.5) * 0.0025
      })
    }

    // Lightning
    if (active) {
      flashCooldown.current -= delta
      if (flashCooldown.current <= 0 && Math.random() < 0.003) {
        flashRef.current = 0.18 + Math.random() * 0.1
        flashCooldown.current = 10 + Math.random() * 18
      }
    }
    if (flashRef.current > 0) flashRef.current -= delta * 1.5

    if (op < 0.01) {
      if (rainRef.current) rainRef.current.visible = false
      if (splashRef.current) splashRef.current.visible = false
      if (rippleGroupRef.current) rippleGroupRef.current.visible = false
      return
    }

    // Rain
    if (rainRef.current) {
      rainRef.current.visible = true
      const pos = rainRef.current.geometry.attributes.position
      for (let i = 0; i < RAIN_COUNT; i++) {
        ;(pos.array as Float32Array)[i * 3 + 1] -= rainData.speeds[i]
        ;(pos.array as Float32Array)[i * 3] += rainData.windX[i]
        ;(pos.array as Float32Array)[i * 3 + 2] += rainData.windZ[i]

        if ((pos.array[i * 3 + 1] as number) < -1) {
          // Spawn splash
          const si = splashIdx.current % SPLASH_COUNT
          const px = pos.array[i * 3] as number
          const pz = pos.array[i * 3 + 2] as number
          ;(splashData.positions)[si * 3] = px
          ;(splashData.positions)[si * 3 + 1] = -0.25 + Math.random() * 0.4
          ;(splashData.positions)[si * 3 + 2] = pz
          ;(splashData.velocities)[si * 3] = (Math.random() - 0.5) * 0.12
          ;(splashData.velocities)[si * 3 + 1] = 0.05 + Math.random() * 0.08
          ;(splashData.velocities)[si * 3 + 2] = (Math.random() - 0.5) * 0.12
          splashData.life[si] = 1
          splashIdx.current++

          // Activate a ground ripple
          if (Math.random() < 0.08) {
            const ri = Math.floor(Math.random() * RIPPLE_COUNT)
            const rd = rippleData.current[ri]
            rd.x = px; rd.z = pz
            rd.progress = 0; rd.active = true
          }

          // Reset drop
          ;(pos.array as Float32Array)[i * 3 + 1] = 16 + Math.random() * 4
          ;(pos.array as Float32Array)[i * 3] = (Math.random() - 0.5) * 26
          ;(pos.array as Float32Array)[i * 3 + 2] = (Math.random() - 0.5) * 26
        }
      }
      pos.needsUpdate = true
      const flashBoost = flashRef.current > 0 ? flashRef.current * 0.45 : 0
      ;(rainRef.current.material as THREE.PointsMaterial).opacity = op * 0.38 + flashBoost
    }

    // Splashes
    if (splashRef.current) {
      splashRef.current.visible = true
      const pos = splashRef.current.geometry.attributes.position
      for (let i = 0; i < SPLASH_COUNT; i++) {
        if (splashData.life[i] > 0) {
          splashData.life[i] -= delta * 3.5
          ;(pos.array as Float32Array)[i * 3] += splashData.velocities[i * 3] * delta
          ;(pos.array as Float32Array)[i * 3 + 1] += splashData.velocities[i * 3 + 1] * delta
          ;(pos.array as Float32Array)[i * 3 + 2] += splashData.velocities[i * 3 + 2] * delta
          splashData.velocities[i * 3 + 1] -= delta * 0.2 // gravity
        }
      }
      pos.needsUpdate = true
      ;(splashRef.current.material as THREE.PointsMaterial).opacity = op * 0.28
    }

    // Ground ripple rings
    if (rippleGroupRef.current) {
      rippleGroupRef.current.visible = true
      rippleData.current.forEach((rd, i) => {
        const ring = rippleGroupRef.current!.children[i] as THREE.Mesh
        if (!ring) return
        if (!rd.active) { ring.visible = false; return }

        rd.progress += delta * rd.speed
        if (rd.progress >= 1) { rd.active = false; ring.visible = false; return }

        ring.visible = true
        ring.position.set(rd.x, -0.28, rd.z)
        const scale = 0.02 + rd.progress * 0.8
        ring.scale.set(scale, 1, scale)
        ;(ring.material as THREE.MeshBasicMaterial).opacity = op * (1 - rd.progress) * 0.22
      })
    }
  })

  return (
    <group>
      {/* Low-lying mist fog plane */}
      <mesh ref={fogPlaneRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} visible={false}>
        <planeGeometry args={[40, 40, 1, 1]} />
        <meshBasicMaterial
          color="#1a2a4a"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Storm cloud layer */}
      <group ref={cloudRef} visible={false}>
        {[
          { pos: [-4, 11.5, -4] as [number,number,number], s: [9, 1.8, 5] as [number,number,number] },
          { pos: [5, 11, -3] as [number,number,number], s: [8, 1.4, 4] as [number,number,number] },
          { pos: [0, 12, -8] as [number,number,number], s: [11, 1.2, 5.5] as [number,number,number] },
          { pos: [-6, 10.5, -9] as [number,number,number], s: [7, 1.5, 3.5] as [number,number,number] },
          { pos: [3, 11.5, -6] as [number,number,number], s: [6, 1.1, 3] as [number,number,number] },
        ].map((cloud, i) => (
          <mesh key={i} position={cloud.pos} scale={cloud.s}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#0d1020" transparent opacity={0.08} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Rain drops */}
      <points ref={rainRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[rainData.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={rainTex} size={0.12} transparent opacity={0} depthWrite={false} sizeAttenuation />
      </points>

      {/* Splash particles */}
      <points ref={splashRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[splashData.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={splashTex} size={0.07} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>

      {/* Ground ripple rings */}
      <group ref={rippleGroupRef} visible={false}>
        {Array.from({ length: RIPPLE_COUNT }, (_, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <torusGeometry args={[1, 0.06, 4, 20]} />
            <meshBasicMaterial
              color="#8ab4d4"
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
