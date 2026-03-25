import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MeditationStonesProps {
  onCollect: (message: string) => void
  calmLevel: number
}

const wisdomMessages = [
  '此刻你是安全的',
  '接受不完美的自己',
  '一切都会过去的',
  '你比想象中更强大',
  '深呼吸，一切都好',
  '放下控制，享受当下',
  '你值得被温柔以待',
  '慢慢来，比较快',
]

interface StoneState {
  collected: boolean
  collectProgress: number
  hoverProgress: number
  hovered: boolean
}

const stoneColors = [
  { c: '#a78bfa', e: '#7c3aed', glow: '#8b5cf6' },
  { c: '#60a5fa', e: '#2563eb', glow: '#3b82f6' },
  { c: '#34d399', e: '#059669', glow: '#10b981' },
  { c: '#fbbf24', e: '#d97706', glow: '#f59e0b' },
  { c: '#f472b6', e: '#db2777', glow: '#ec4899' },
  { c: '#c084fc', e: '#9333ea', glow: '#a855f7' },
  { c: '#38bdf8', e: '#0284c7', glow: '#0ea5e9' },
  { c: '#4ade80', e: '#16a34a', glow: '#22c55e' },
]

const stoneGeo = new THREE.DodecahedronGeometry(0.22, 1)
const ringGeo = new THREE.TorusGeometry(0.38, 0.014, 6, 24)
const outerRingGeo = new THREE.TorusGeometry(0.55, 0.008, 4, 32)

// Rune/symbol textures for each stone
const runeTextures: THREE.CanvasTexture[] = []
const runeSymbols = ['平', '静', '安', '禅', '心', '和', '悟', '空']
runeSymbols.forEach((sym) => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 64, 64)
  ctx.font = '300 28px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText(sym, 32, 32)
  runeTextures.push(new THREE.CanvasTexture(c))
})

export function MeditationStones({ onCollect, calmLevel }: MeditationStonesProps) {
  const statesRef = useRef<StoneState[]>(
    Array.from({ length: 8 }, () => ({ collected: false, collectProgress: 0, hoverProgress: 0, hovered: false }))
  )
  const groupRef = useRef<THREE.Group>(null)
  const collectBurstRef = useRef<THREE.Group>(null)
  const burstActive = useRef<{ active: boolean; progress: number; pos: THREE.Vector3; color: THREE.Color }[]>(
    Array.from({ length: 8 }, () => ({ active: false, progress: 0, pos: new THREE.Vector3(), color: new THREE.Color() }))
  )

  const stonePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2
      const radius = 5.2 + (i % 3) * 0.8
      positions.push([Math.cos(angle) * radius, 2 + Math.sin(i * 1.5) * 1.8, Math.sin(angle) * radius])
    }
    return positions
  }, [])

  const handleClick = useCallback((index: number) => {
    const state = statesRef.current[index]
    if (!state.collected) {
      state.collected = true
      state.collectProgress = 0
      const burst = burstActive.current[index]
      burst.active = true
      burst.progress = 0
      burst.pos.set(...stonePositions[index])
      burst.color.set(stoneColors[index].glow)
      onCollect(wisdomMessages[index])
    }
  }, [onCollect, stonePositions])

  useFrame((clock, delta) => {
    if (!groupRef.current) return
    const t = clock.clock.elapsedTime

    groupRef.current.children.forEach((child, i) => {
      const state = statesRef.current[i]
      if (!state) return
      const group = child as THREE.Group

      const visible = calmLevel >= i * 10 && state.collectProgress < 1
      group.visible = visible
      if (!visible) return

      if (state.collected) {
        state.collectProgress = Math.min(1, state.collectProgress + delta * 0.8)
        const p = state.collectProgress
        group.position.set(
          stonePositions[i][0] + Math.sin(p * Math.PI * 3) * 0.3,
          stonePositions[i][1] + p * 4,
          stonePositions[i][2]
        )
        group.scale.setScalar(Math.max(0, 1 - p * 1.2))
        group.rotation.y = p * Math.PI * 6
        // Fade children
        group.traverse(obj => {
          const m = obj as THREE.Mesh
          if (m.material && 'opacity' in m.material) {
            ;(m.material as THREE.MeshBasicMaterial).opacity *= (1 - delta * 1.5)
          }
        })
        return
      }

      // Hover scale
      const targetHover = state.hovered ? 1 : 0
      state.hoverProgress += (targetHover - state.hoverProgress) * delta * 6
      const hoverBoost = 1 + state.hoverProgress * 0.18

      group.position.set(
        stonePositions[i][0],
        stonePositions[i][1] + Math.sin(t * 0.7 + i * 1.3) * 0.28,
        stonePositions[i][2]
      )
      group.rotation.y = t * 0.3 + i
      group.scale.setScalar(hoverBoost)

      // Animate rings
      const innerRing = group.children[0] as THREE.Mesh
      if (innerRing) {
        innerRing.rotation.x = t * 0.8 + i * 0.4
        innerRing.rotation.z = t * 0.5 + i * 0.6
        ;(innerRing.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 1.5 + i) * 0.08 + state.hoverProgress * 0.15
      }
      const outerRing = group.children[1] as THREE.Mesh
      if (outerRing) {
        outerRing.rotation.x = -t * 0.4 + i * 0.3
        outerRing.rotation.z = t * 0.6 + i
        ;(outerRing.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(t * 0.9 + i * 1.2) * 0.04 + state.hoverProgress * 0.08
      }

      // Stone emissive pulse
      const stoneMesh = group.children[2] as THREE.Mesh
      if (stoneMesh && stoneMesh.material) {
        ;(stoneMesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.35 + Math.sin(t * 1.8 + i * 0.9) * 0.15 + state.hoverProgress * 0.4
      }

      // Glow pulse
      const glowMesh = group.children[3] as THREE.Mesh
      if (glowMesh) {
        const glowScale = 0.55 + Math.sin(t * 1.2 + i * 0.7) * 0.08 + state.hoverProgress * 0.15
        glowMesh.scale.setScalar(glowScale)
        ;(glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 1.2 + i * 0.7) * 0.04 + state.hoverProgress * 0.1
      }
    })

    // Collect burst particles
    if (collectBurstRef.current) {
      burstActive.current.forEach((burst, bi) => {
        if (!burst.active) {
          collectBurstRef.current!.children[bi].visible = false
          return
        }
        burst.progress += delta * 1.8
        const burstGroup = collectBurstRef.current!.children[bi] as THREE.Group
        if (!burstGroup) return

        if (burst.progress < 1) {
          burstGroup.visible = true
          // Expanding rings
          burstGroup.children.forEach((child, ri) => {
            const mesh = child as THREE.Mesh
            const ringScale = (ri + 1) * 0.5 + burst.progress * (ri + 1) * 1.5
            mesh.position.copy(burst.pos)
            mesh.scale.setScalar(ringScale)
            ;(mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.4 - burst.progress * 0.4) / (ri + 1))
            ;(mesh.material as THREE.MeshBasicMaterial).color.copy(burst.color)
          })
        } else {
          burst.active = false
          burstGroup.visible = false
        }
      })
    }
  })

  return (
    <>
      <group ref={groupRef}>
        {stonePositions.map((pos, i) => (
          <group key={i} position={pos}>
            {/* Inner ring */}
            <mesh geometry={ringGeo}>
              <meshBasicMaterial color={stoneColors[i].c} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Outer ring */}
            <mesh geometry={outerRingGeo}>
              <meshBasicMaterial color={stoneColors[i].c} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Stone */}
            <mesh
              geometry={stoneGeo}
              onClick={(e) => { e.stopPropagation(); handleClick(i) }}
              onPointerEnter={() => { document.body.style.cursor = 'pointer'; statesRef.current[i].hovered = true }}
              onPointerLeave={() => { document.body.style.cursor = 'default'; statesRef.current[i].hovered = false }}
            >
              <meshStandardMaterial
                color={stoneColors[i].c}
                emissive={stoneColors[i].e}
                emissiveIntensity={0.4}
                roughness={0.15}
                metalness={0.6}
              />
            </mesh>
            {/* Glow */}
            <mesh>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color={stoneColors[i].glow} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Rune label above stone */}
            <sprite position={[0, 0.45, 0]} scale={[0.35, 0.35, 1]}>
              <spriteMaterial map={runeTextures[i]} transparent opacity={0.55} depthTest={false} />
            </sprite>
          </group>
        ))}
      </group>

      {/* Collection burst rings */}
      <group ref={collectBurstRef}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} visible={false}>
            {[0, 1, 2].map((ri) => (
              <mesh key={ri}>
                <torusGeometry args={[1, 0.04, 4, 24]} />
                <meshBasicMaterial color={stoneColors[i].glow} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </>
  )
}
