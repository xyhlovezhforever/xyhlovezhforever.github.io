import { useRef, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface WindChimesProps {
  onChime: (noteIndex: number) => void
}

const notes = [
  { color: '#60a5fa', emissive: '#1d4ed8' },
  { color: '#a78bfa', emissive: '#6d28d9' },
  { color: '#f472b6', emissive: '#be185d' },
  { color: '#34d399', emissive: '#065f46' },
  { color: '#fbbf24', emissive: '#b45309' },
]


const WAVE_COUNT = 3 // rings per strike

export function WindChimes({ onChime }: WindChimesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tubeRefs = useRef<THREE.Group[]>([])
  const tubeGlowRefs = useRef<THREE.Mesh[]>([])
  const strikeTimers = useRef<number[]>(notes.map(() => 0))
  const ringGroupRefs = useRef<THREE.Group[]>([]) // one group per note
  const windTimer = useRef(0)

  // Per-note ring state: each note has WAVE_COUNT rings with their own progress
  const ringWaves = useRef<{ progress: number; active: boolean }[][]>(
    notes.map(() => Array.from({ length: WAVE_COUNT }, () => ({ progress: 0, active: false })))
  )

  const handleClick = useCallback((index: number) => {
    onChime(index)
    strikeTimers.current[index] = 1
    // Stagger-launch rings
    ringWaves.current[index].forEach((w, ri) => {
      w.progress = -(ri * 0.15) // stagger delay
      w.active = true
    })
  }, [onChime])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.22) * 0.012
      groupRef.current.rotation.x = Math.cos(t * 0.18) * 0.006
    }

    // Wind auto-chime
    windTimer.current -= delta
    if (windTimer.current <= 0) {
      windTimer.current = 3.5 + Math.random() * 9
      const idx = Math.floor(Math.random() * notes.length)
      onChime(idx)
      strikeTimers.current[idx] = 1
      ringWaves.current[idx].forEach((w, ri) => {
        w.progress = -(ri * 0.15)
        w.active = true
      })
    }

    tubeRefs.current.forEach((tube, i) => {
      if (!tube) return
      if (strikeTimers.current[i] > 0) strikeTimers.current[i] = Math.max(0, strikeTimers.current[i] - delta * 0.9)
      const windSway = Math.sin(t * 0.7 + i * 1.5) * 0.022
      const strikeSway = Math.sin(t * 13 + i) * strikeTimers.current[i] * 0.14
      tube.rotation.x = windSway + strikeSway
      tube.rotation.z = Math.cos(t * 0.5 + i * 2) * 0.012 + strikeSway * 0.35

      // Tube glow pulses on strike
      const glow = tubeGlowRefs.current[i]
      if (glow) {
        const glowAlpha = strikeTimers.current[i]
        glow.visible = glowAlpha > 0.02
        glow.scale.setScalar(0.05 + glowAlpha * 0.12)
        ;(glow.material as THREE.MeshBasicMaterial).opacity = glowAlpha * 0.4
      }
    })

    // Ripple ring groups
    ringGroupRefs.current.forEach((grp, ni) => {
      if (!grp) return
      const waves = ringWaves.current[ni]
      waves.forEach((wave, wi) => {
        const ring = grp.children[wi] as THREE.Mesh
        if (!ring) return
        if (!wave.active) { ring.visible = false; return }

        wave.progress += delta * 1.4
        if (wave.progress >= 1) {
          wave.active = false
          ring.visible = false
          return
        }
        if (wave.progress < 0) { ring.visible = false; return }

        ring.visible = true
        const p = wave.progress
        const scale = 0.04 + p * 0.55
        ring.scale.setScalar(scale)
        ;(ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.45)
      })
    })
  })

  // Tube length per note
  const tubeLengths = useMemo(() => notes.map((_, i) => 0.22 + i * 0.055), [])

  return (
    <group ref={groupRef} position={[2.5, 2.2, -1.5]}>
      {/* Wooden top beam */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.028, 0.65, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.82} metalness={0.1} />
      </mesh>
      {/* Center knot */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.032, 8, 6]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.65} roughness={0.25} />
      </mesh>
      {/* Hanging cord */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.46, 4]} />
        <meshStandardMaterial color="#c0a060" roughness={0.9} />
      </mesh>

      {/* Chime tubes */}
      {notes.map((note, i) => {
        const x = (i - 2) * 0.105
        const tubeLen = tubeLengths[i]
        return (
          <group
            key={i}
            ref={(el: THREE.Group | null) => { if (el) tubeRefs.current[i] = el }}
            position={[x, -0.02, 0]}
          >
            {/* Silk string */}
            <mesh position={[0, -(tubeLen * 0.5 + 0.04), 0]}>
              <cylinderGeometry args={[0.0018, 0.0018, tubeLen * 0.5 + 0.08, 3]} />
              <meshStandardMaterial color="#d0c090" roughness={0.9} transparent opacity={0.8} />
            </mesh>

            {/* Metallic tube */}
            <mesh
              position={[0, -(tubeLen * 0.5 + tubeLen * 0.5 + 0.08), 0]}
              onClick={(e) => { e.stopPropagation(); handleClick(i) }}
              onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
              onPointerLeave={() => { document.body.style.cursor = 'default' }}
            >
              <cylinderGeometry args={[0.013, 0.013, tubeLen, 8]} />
              <meshStandardMaterial
                color={note.color}
                emissive={note.emissive}
                emissiveIntensity={0.15 + strikeTimers.current[i] * 0.6}
                metalness={0.85}
                roughness={0.12}
              />
            </mesh>

            {/* Tube end cap */}
            <mesh position={[0, -(tubeLen + tubeLen * 0.5 + 0.08 + 0.003), 0]}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshStandardMaterial color={note.color} metalness={0.9} roughness={0.08} />
            </mesh>

            {/* Tube glow aura (visible on strike) */}
            <mesh
              ref={(el: THREE.Mesh | null) => { if (el) tubeGlowRefs.current[i] = el }}
              position={[0, -(tubeLen * 0.5 + tubeLen * 0.5 + 0.08), 0]}
              visible={false}
            >
              <cylinderGeometry args={[0.1, 0.1, tubeLen * 1.1, 8]} />
              <meshBasicMaterial color={note.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>

            {/* Ripple ring group */}
            <group
              ref={(el: THREE.Group | null) => { if (el) ringGroupRefs.current[i] = el }}
              position={[0, -(tubeLen * 0.5 + tubeLen * 0.5 + 0.08), 0]}
            >
              {Array.from({ length: WAVE_COUNT }, (_, wi) => (
                <mesh key={wi} rotation={[Math.PI / 2, 0, 0]} visible={false}>
                  <torusGeometry args={[1, 0.12, 4, 20]} />
                  <meshBasicMaterial
                    color={note.color}
                    transparent opacity={0}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              ))}
            </group>
          </group>
        )
      })}

      {/* Wind catcher — small ornamental sail */}
      <mesh position={[0, -0.38, 0.025]} rotation={[0.12, 0, 0]}>
        <planeGeometry args={[0.065, 0.11]} />
        <meshStandardMaterial color="#f0e6c0" side={THREE.DoubleSide} transparent opacity={0.55} roughness={0.95} />
      </mesh>

      {/* Small beads on cross-cord */}
      {[-0.22, 0, 0.22].map((bx, i) => (
        <mesh key={i} position={[bx, -0.005, 0]}>
          <sphereGeometry args={[0.009, 6, 6]} />
          <meshStandardMaterial color="#e8d5a0" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
