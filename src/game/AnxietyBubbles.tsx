import { useRef, useCallback, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface AnxietyBubblesProps {
  onBubblePopped: (combo: number) => void
}

const anxietyWords = [
  '焦虑', '压力', '恐惧', '不安', '烦躁',
  '担忧', '紧张', '急躁', '忧虑', '迷茫',
  '内耗', '疲惫', '无力', '困惑', '慌张',
  '心烦', '沮丧', '挣扎', '犹豫', '怀疑',
  '孤独', '自卑', '逃避', '拖延', '失眠',
  '攀比', '完美主义', '过度思考', '害怕失败',
]

interface BubbleData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  scale: number
  color: THREE.Color
  text: string
  opacity: number
  popping: boolean
  popProgress: number
  type: 'normal' | 'big' | 'chain' | 'golden'
  age: number
  wobblePhase: number
  pulseSpeed: number
  active: boolean
}

// Pop particle burst data
interface PopBurst {
  active: boolean
  position: THREE.Vector3
  progress: number
  color: THREE.Color
  count: number
}

const MAX_BUBBLES = 18
const MAX_BURSTS = 8
const typeConfigs = {
  normal: { colors: ['#ef4444', '#f97316', '#f43f5e', '#e879f9', '#fb7185'], scaleRange: [0.25, 0.55] },
  big: { colors: ['#f97316'], scaleRange: [0.55, 0.85] },
  chain: { colors: ['#eab308'], scaleRange: [0.35, 0.55] },
  golden: { colors: ['#fbbf24'], scaleRange: [0.3, 0.45] },
}

const textTextureCache = new Map<string, THREE.CanvasTexture>()
function getTextTexture(text: string, type: string) {
  const key = `${text}_${type}`
  if (textTextureCache.has(key)) return textTextureCache.get(key)!
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 128, 128)
  ctx.font = text.length > 3 ? 'bold 22px sans-serif' : 'bold 30px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillText(text, 64, 64)
  if (type === 'golden') {
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255,215,0,0.8)'
    ctx.fillText('x3', 64, 88)
  }
  const tex = new THREE.CanvasTexture(canvas)
  textTextureCache.set(key, tex)
  return tex
}

// Pop burst texture
const popBurstTex = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
  return new THREE.CanvasTexture(c)
})()

function createBubbleData(_index: number): BubbleData {
  const r = Math.random()
  const type: BubbleData['type'] = r < 0.05 ? 'golden' : r < 0.15 ? 'chain' : r < 0.3 ? 'big' : 'normal'
  const cfg = typeConfigs[type]
  const colorStr = cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
  const angle = Math.random() * Math.PI * 2
  const radius = 3.5 + Math.random() * 5
  return {
    position: new THREE.Vector3(Math.cos(angle) * radius, Math.random() * 7 - 1.5, Math.sin(angle) * radius),
    velocity: new THREE.Vector3((Math.random() - 0.5) * 0.005, 0.003 + Math.random() * 0.005, (Math.random() - 0.5) * 0.005),
    scale: cfg.scaleRange[0] + Math.random() * (cfg.scaleRange[1] - cfg.scaleRange[0]),
    color: new THREE.Color(colorStr),
    text: anxietyWords[Math.floor(Math.random() * anxietyWords.length)],
    opacity: 0.55 + Math.random() * 0.35,
    popping: false,
    popProgress: 0,
    type,
    age: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 1.5 + Math.random() * 2,
    active: true,
  }
}

const bubbleGeo = new THREE.SphereGeometry(1, 20, 20)
const glowGeo = new THREE.SphereGeometry(1, 10, 10)
const ringGeo = new THREE.TorusGeometry(1, 0.06, 4, 16)

// Per-burst particle positions (12 sparks per burst)
const SPARKS_PER_BURST = 12
function createBurstPositions(): Float32Array {
  return new Float32Array(SPARKS_PER_BURST * 3)
}

export function AnxietyBubbles({ onBubblePopped }: AnxietyBubblesProps) {
  const bubblesRef = useRef<BubbleData[]>([])
  const meshGroupRef = useRef<THREE.Group>(null)
  const burstGroupRef = useRef<THREE.Group>(null)
  const spawnTimer = useRef(0)
  const comboTimer = useRef(0)
  const comboCount = useRef(0)
  const { raycaster, pointer, camera } = useThree()

  // Pop bursts pool
  const bursts = useRef<PopBurst[]>(
    Array.from({ length: MAX_BURSTS }, () => ({
      active: false,
      position: new THREE.Vector3(),
      progress: 0,
      color: new THREE.Color(),
      count: SPARKS_PER_BURST,
    }))
  )
  const burstParticlePositions = useRef<Float32Array[]>(
    Array.from({ length: MAX_BURSTS }, () => createBurstPositions())
  )
  // Burst spark velocities (per burst)
  const burstVelocities = useMemo(() => {
    return Array.from({ length: MAX_BURSTS }, () => {
      const vel = new Float32Array(SPARKS_PER_BURST * 3)
      for (let i = 0; i < SPARKS_PER_BURST; i++) {
        const phi = (i / SPARKS_PER_BURST) * Math.PI * 2
        const theta = Math.random() * Math.PI
        const speed = 0.04 + Math.random() * 0.06
        vel[i * 3] = Math.sin(theta) * Math.cos(phi) * speed
        vel[i * 3 + 1] = Math.cos(theta) * speed + 0.02
        vel[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * speed
      }
      return vel
    })
  }, [])

  useEffect(() => {
    bubblesRef.current = Array.from({ length: 12 }, (_, i) => createBubbleData(i))
  }, [])

  const triggerBurst = useCallback((pos: THREE.Vector3, color: THREE.Color, type: string) => {
    const burst = bursts.current.find(b => !b.active)
    if (!burst) return
    burst.active = true
    burst.position.copy(pos)
    burst.progress = 0
    burst.color.copy(color)
    burst.count = type === 'golden' ? SPARKS_PER_BURST : type === 'big' ? 10 : 8

    // Reset burst velocities with randomness
    const bIdx = bursts.current.indexOf(burst)
    const vel = burstVelocities[bIdx]
    for (let i = 0; i < SPARKS_PER_BURST; i++) {
      const phi = (i / SPARKS_PER_BURST) * Math.PI * 2 + Math.random() * 0.8
      const speed = 0.04 + Math.random() * 0.07
      vel[i * 3] = Math.cos(phi) * speed
      vel[i * 3 + 1] = (Math.random() - 0.3) * speed * 1.5
      vel[i * 3 + 2] = Math.sin(phi) * speed
    }
  }, [burstVelocities])

  const handleClick = useCallback(() => {
    if (!meshGroupRef.current) return
    raycaster.setFromCamera(pointer, camera)
    const meshes: THREE.Mesh[] = []
    meshGroupRef.current.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh && obj.userData.bubbleIndex !== undefined) {
        meshes.push(obj as THREE.Mesh)
      }
    })
    const hits = raycaster.intersectObjects(meshes)
    if (hits.length > 0) {
      const idx = hits[0].object.userData.bubbleIndex as number
      const bubble = bubblesRef.current[idx]
      if (bubble && bubble.active && !bubble.popping) {
        bubble.popping = true
        bubble.popProgress = 0

        // Trigger burst
        triggerBurst(bubble.position.clone(), bubble.color, bubble.type)

        if (bubble.type === 'chain') {
          bubblesRef.current.forEach(b => {
            if (b.active && !b.popping && b.position.distanceTo(bubble.position) < 3) {
              b.popping = true
              b.popProgress = 0
              triggerBurst(b.position.clone(), b.color, b.type)
            }
          })
        }

        comboTimer.current = 2
        comboCount.current++
        onBubblePopped(comboCount.current)
      }
    }
  }, [raycaster, pointer, camera, onBubblePopped, triggerBurst])

  useEffect(() => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('click', handleClick)
      return () => canvas.removeEventListener('click', handleClick)
    }
  }, [handleClick])

  useFrame((state, delta) => {
    if (!meshGroupRef.current) return
    const t = state.clock.elapsedTime
    const bubbles = bubblesRef.current

    comboTimer.current -= delta
    if (comboTimer.current <= 0) comboCount.current = 0

    spawnTimer.current += delta
    if (spawnTimer.current > 1.5) {
      spawnTimer.current = 0
      const activeCount = bubbles.filter(b => b.active).length
      if (activeCount < MAX_BUBBLES) {
        const inactive = bubbles.find(b => !b.active)
        if (inactive) Object.assign(inactive, createBubbleData(0))
        else if (bubbles.length < MAX_BUBBLES) bubbles.push(createBubbleData(bubbles.length))
      }
    }

    // Update bubbles
    let childIdx = 0
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i]
      if (!b.active) continue

      const groupChild = meshGroupRef.current.children[childIdx] as THREE.Group
      if (!groupChild) continue
      childIdx++

      if (b.popping) {
        b.popProgress += delta * 2.2
        if (b.popProgress >= 1) {
          b.active = false
          groupChild.visible = false
          continue
        }
        const popScale = 1 + b.popProgress * 2.8
        const popOpacity = Math.max(0, 1 - b.popProgress * 1.2)
        groupChild.position.copy(b.position)
        groupChild.scale.setScalar(popScale)

        // Ring expand on pop
        groupChild.traverse(obj => {
          const mesh = obj as THREE.Mesh
          if (!mesh.material) return
          const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshPhysicalMaterial
          if ('opacity' in mat) {
            if (obj.userData.isRing) {
              mat.opacity = popOpacity * 0.5
            } else {
              mat.opacity = popOpacity * 0.25
            }
          }
        })
        continue
      }

      // Physics
      b.position.add(b.velocity)
      const angle = Math.atan2(b.position.z, b.position.x) + 0.0008
      const dist = Math.sqrt(b.position.x * b.position.x + b.position.z * b.position.z)
      b.position.x = Math.cos(angle) * dist + Math.sin(b.age * b.pulseSpeed + b.wobblePhase) * 0.004
      b.position.z = Math.sin(angle) * dist + Math.cos(b.age * b.pulseSpeed * 0.7 + b.wobblePhase) * 0.004
      b.position.y += Math.sin(t * 2 + i) * 0.003
      if (b.position.y > 7) b.velocity.y *= -0.5
      if (b.position.y < -1.5) b.velocity.y = Math.abs(b.velocity.y)
      b.age += delta

      // Pulse glow with type
      const glowChild = groupChild.children[0] as THREE.Mesh
      if (glowChild && glowChild.material) {
        const pulse = 0.06 + Math.sin(t * b.pulseSpeed + b.wobblePhase) * 0.03
        ;(glowChild.material as THREE.MeshBasicMaterial).opacity = b.type === 'golden' ? pulse * 2 : pulse
        glowChild.scale.setScalar(1.5 + Math.sin(t * b.pulseSpeed * 0.5 + b.wobblePhase) * 0.15)
      }

      groupChild.position.copy(b.position)
      groupChild.visible = true
      groupChild.scale.setScalar(b.scale)
    }

    for (let j = childIdx; j < meshGroupRef.current.children.length; j++) {
      meshGroupRef.current.children[j].visible = false
    }

    // Animate pop bursts
    if (burstGroupRef.current) {
      bursts.current.forEach((burst, bi) => {
        if (!burst.active) {
          if (burstGroupRef.current!.children[bi]) burstGroupRef.current!.children[bi].visible = false
          return
        }
        burst.progress += delta * 3

        const burstGroup = burstGroupRef.current!.children[bi] as THREE.Group
        if (!burstGroup) return

        const sparkCount = burst.count
        const vel = burstVelocities[bi]
        const posArr = burstParticlePositions.current[bi]

        if (burst.progress < 1) {
          burstGroup.visible = true
          for (let i = 0; i < sparkCount; i++) {
            posArr[i * 3] = burst.position.x + vel[i * 3] * burst.progress * 12
            posArr[i * 3 + 1] = burst.position.y + vel[i * 3 + 1] * burst.progress * 12 - burst.progress * burst.progress * 0.5
            posArr[i * 3 + 2] = burst.position.z + vel[i * 3 + 2] * burst.progress * 12
          }

          const points = burstGroup.children[0] as THREE.Points
          if (points) {
            const geo = points.geometry
            const posAttr = geo.attributes.position
            for (let i = 0; i < sparkCount * 3; i++) {
              ;(posAttr.array as Float32Array)[i] = posArr[i]
            }
            posAttr.needsUpdate = true
            ;(points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - burst.progress * 0.9)
            ;(points.material as THREE.PointsMaterial).color.copy(burst.color)
          }

          // Expanding ring
          const ring = burstGroup.children[1] as THREE.Mesh
          if (ring) {
            ring.position.copy(burst.position)
            ring.scale.setScalar(burst.progress * 3 + 0.5)
            ;(ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - burst.progress * 0.4)
            ;(ring.material as THREE.MeshBasicMaterial).color.copy(burst.color)
          }
        } else {
          burst.active = false
          burstGroup.visible = false
        }
      })
    }
  })

  const bubbleMeshes = useMemo(() => {
    return Array.from({ length: MAX_BUBBLES }, (_, i) => {
      const data = i < 12 ? createBubbleData(i) : createBubbleData(0)
      return { data, texture: getTextTexture(data.text, data.type) }
    })
  }, [])

  // Pre-create burst geometry
  const burstGeos = useMemo(() => {
    return Array.from({ length: MAX_BURSTS }, () => {
      const geo = new THREE.BufferGeometry()
      const pos = new Float32Array(SPARKS_PER_BURST * 3)
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      return geo
    })
  }, [])

  return (
    <>
      <group
        ref={meshGroupRef}
        onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { document.body.style.cursor = 'default' }}
      >
        {bubbleMeshes.map((bm, i) => (
          <group key={i} scale={bm.data.scale}>
            {/* Outer glow */}
            <mesh geometry={glowGeo} scale={1.8}>
              <meshBasicMaterial color={bm.data.color} transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Inner glow */}
            <mesh geometry={glowGeo} scale={1.2}>
              <meshBasicMaterial color={bm.data.color} transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Bubble */}
            <mesh geometry={bubbleGeo} userData={{ bubbleIndex: i }}>
              <meshPhysicalMaterial
                color={bm.data.color}
                transparent
                opacity={bm.data.opacity * 0.35}
                roughness={0.05}
                metalness={0.1}
                clearcoat={1}
                clearcoatRoughness={0}
                transmission={0.6}
                thickness={0.3}
                emissive={bm.data.color}
                emissiveIntensity={bm.data.type === 'golden' ? 0.45 : 0.2}
              />
            </mesh>
            {/* Pop ring (visible during pop) */}
            <mesh geometry={ringGeo} userData={{ isRing: true }}>
              <meshBasicMaterial color={bm.data.color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
            {/* Text */}
            <sprite scale={[1.3, 1.3, 1]}>
              <spriteMaterial map={bm.texture} transparent opacity={0.9} depthTest={false} />
            </sprite>
          </group>
        ))}
      </group>

      {/* Pop burst particles */}
      <group ref={burstGroupRef}>
        {Array.from({ length: MAX_BURSTS }, (_, bi) => (
          <group key={bi} visible={false}>
            <points geometry={burstGeos[bi]}>
              <pointsMaterial map={popBurstTex} size={0.12} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation color="#ffffff" />
            </points>
            {/* Expanding ring on pop */}
            <mesh>
              <torusGeometry args={[1, 0.04, 4, 20]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  )
}
