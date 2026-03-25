import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Suspense } from 'react'

interface StartScreenProps {
  onStart: () => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [phase, setPhase] = useState<'entering' | 'idle' | 'leaving'>('entering')
  const [tipIndex, setTipIndex] = useState(0)
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)

  const tips = useMemo(() => [
    '点击焦虑气泡来消除负面情绪',
    '快速连击获得积分加成',
    '收集漂浮的冥想石获取智慧',
    '按空格键进入呼吸练习模式',
    '按 L 放飞心愿天灯',
    '按 R 切换雨天模式',
    '点击风铃聆听清脆音色',
  ], [])

  useEffect(() => {
    setTimeout(() => setPhase('idle'), 100)
    const t = setInterval(() => setTipIndex(i => (i + 1) % tips.length), 3800)
    return () => clearInterval(t)
  }, [tips.length])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX((e.clientX / window.innerWidth - 0.5) * 2)
    setMouseY((e.clientY / window.innerHeight - 0.5) * 2)
  }, [])

  const handleStart = () => {
    setPhase('leaving')
    setTimeout(onStart, 900)
  }

  const visible = phase !== 'entering'
  const leaving = phase === 'leaving'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, overflow: 'hidden',
        opacity: leaving ? 0 : visible ? 1 : 0,
        transition: leaving ? 'opacity 0.9s ease' : 'opacity 1.2s ease',
      }}
      onMouseMove={handleMouseMove}
    >
      {/* 3D Background Canvas */}
      <Canvas
        camera={{ position: [0, 1.5, 9], fov: 52 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#040818']} />
          <fog attach="fog" args={['#040818', 14, 38]} />
          <ambientLight intensity={0.18} color="#9ba8c8" />
          <directionalLight position={[4, 10, 6]} intensity={0.5} color="#d4c5ff" />
          <pointLight position={[-4, 4, -2]} intensity={0.3} color="#60a5fa" />
          <pointLight position={[3, 2, 3]} intensity={0.2} color="#f472b6" />

          <StartCameraRig mouseX={mouseX} mouseY={mouseY} />
          <StartIsland />
          <StartCrystalField />
          <StartParticles />
          <StartStars />
          <StartMoon />
          <StartAurora />
          <StartFireflies />
          <StartFloatingRocks />
        </Suspense>
      </Canvas>

      {/* Radial gradient overlay for depth */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 80% at 50% 110%, transparent 40%, rgba(4,8,24,0.7) 100%)',
      }} />

      {/* UI Content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        {/* Subtitle */}
        <div style={{
          fontSize: '11px', letterSpacing: '8px', color: 'rgba(167,139,250,0.5)',
          marginBottom: 14, textTransform: 'uppercase',
          animation: 'titleFade 1.2s ease-out 0.2s both',
        }}>
          心灵治愈体验
        </div>

        {/* Main title with multi-layer glow */}
        <h1 style={{
          fontSize: 'clamp(44px,7vw,72px)', fontWeight: 100, color: '#f0e8ff',
          letterSpacing: '20px', margin: '0 0 6px',
          textShadow: `
            0 0 40px rgba(167,139,250,0.6),
            0 0 80px rgba(139,92,246,0.35),
            0 0 140px rgba(109,40,217,0.2)
          `,
          animation: 'titleFade 1.2s ease-out 0.4s both',
        }}>
          心灵净土
        </h1>

        {/* Decorative line */}
        <div style={{
          width: 180, height: 1, margin: '10px 0 18px',
          background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)',
          animation: 'lineExpand 1.2s ease-out 0.8s both',
        }} />

        <p style={{
          fontSize: '13px', color: 'rgba(196,181,253,0.45)', letterSpacing: '5px', marginBottom: 44,
          animation: 'titleFade 1.2s ease-out 0.9s both',
        }}>
          放下焦虑 · 找回内心的平静
        </p>

        {/* Feature pills — 2 rows */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 44, alignItems: 'center',
          animation: 'titleFade 1.2s ease-out 1.1s both',
        }}>
          {[
            [
              { icon: '🫧', label: '消除焦虑气泡' },
              { icon: '💎', label: '冥想宝石智慧' },
              { icon: '🫁', label: '深呼吸引导' },
            ],
            [
              { icon: '🏮', label: '心愿天灯' },
              { icon: '🎐', label: '风铃音律' },
              { icon: '🌧️', label: '聆听雨声' },
            ],
          ].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 8 }}>
              {row.map((f, i) => (
                <div key={i} style={{
                  background: 'rgba(139,92,246,0.07)',
                  border: '1px solid rgba(167,139,250,0.12)',
                  borderRadius: '20px', padding: '6px 14px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: 'rgba(196,181,253,0.6)', fontSize: '11px', letterSpacing: '1px',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize: '13px' }}>{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <StartButton onStart={handleStart} />

        {/* Tip */}
        <div style={{
          position: 'absolute', bottom: '36px', textAlign: 'center',
          animation: 'titleFade 1.2s ease-out 1.8s both',
        }}>
          <div style={{
            color: 'rgba(167,139,250,0.35)', fontSize: '11px', letterSpacing: '2px',
            transition: 'opacity 0.5s',
          }}>
            💡 {tips[tipIndex]}
          </div>
          {/* Tip indicator dots */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 8 }}>
            {tips.map((_, i) => (
              <div key={i} style={{
                width: i === tipIndex ? 16 : 4, height: 4,
                borderRadius: 2,
                background: i === tipIndex ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)',
                transition: 'width 0.4s ease, background 0.4s ease',
              }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes titleFade {
          from { opacity: 0; transform: translateY(20px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes lineExpand {
          from { width: 0; opacity: 0; }
          to { width: 180px; opacity: 1; }
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(139,92,246,0.15), 0 0 48px rgba(109,40,217,0.08); }
          50% { box-shadow: 0 0 36px rgba(139,92,246,0.28), 0 0 72px rgba(109,40,217,0.15); }
        }
      `}</style>
    </div>
  )
}

function StartButton({ onStart }: { onStart: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={onStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        padding: '16px 60px', fontSize: '15px', letterSpacing: '10px',
        background: hovered
          ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.35))'
          : 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.18))',
        border: `1px solid rgba(167,139,250,${hovered ? '0.55' : '0.22'})`,
        color: hovered ? 'rgba(233,213,255,0.95)' : 'rgba(196,181,253,0.8)',
        borderRadius: '44px', cursor: 'pointer',
        backdropFilter: 'blur(14px)',
        pointerEvents: 'auto',
        transform: pressed ? 'scale(0.97)' : hovered ? 'scale(1.06) translateY(-2px)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        animation: 'titleFade 1.2s ease-out 1.5s both, btnPulse 3s ease-in-out 2s infinite',
        boxShadow: hovered
          ? '0 8px 40px rgba(139,92,246,0.3), 0 0 80px rgba(109,40,217,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 0 24px rgba(139,92,246,0.1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Shine sweep on hover */}
      {hovered && (
        <span style={{
          position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          animation: 'btnShine 0.6s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}
      开始旅程
      <style>{`
        @keyframes btnShine {
          from { left: -100%; }
          to { left: 200%; }
        }
      `}</style>
    </button>
  )
}

/* ============ Camera parallax rig ============ */
function StartCameraRig({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  useFrame((state) => {
    state.camera.position.x += (mouseX * 0.8 - state.camera.position.x) * 0.04
    state.camera.position.y += (-mouseY * 0.4 + 1.5 - state.camera.position.y) * 0.04
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

/* ============ Island ============ */
function StartIsland() {
  const ref = useRef<THREE.Group>(null)
  const waterRef = useRef<THREE.Mesh>(null)
  const crystalRefs = useRef<THREE.Mesh[]>([])

  const islandGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(2.6, 1.6, 1.4, 28, 5)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
      const noise = (n - Math.floor(n)) * 0.35
      const angle = Math.atan2(z, x)
      if (y > 0.3) {
        pos.setY(i, y + noise + Math.sin(angle * 4) * 0.05)
        colors[i * 3] = 0.16 + noise * 0.05; colors[i * 3 + 1] = 0.36 + noise * 0.2; colors[i * 3 + 2] = 0.14
      } else if (y < -0.25) {
        const dist = Math.sqrt(x * x + z * z)
        pos.setX(i, x * (0.6 + noise * 0.35)); pos.setZ(i, z * (0.6 + noise * 0.35))
        pos.setY(i, y - dist * 0.28 + noise * 0.3)
        colors[i * 3] = 0.22; colors[i * 3 + 1] = 0.20; colors[i * 3 + 2] = 0.28
      } else {
        colors[i * 3] = 0.28; colors[i * 3 + 1] = 0.20; colors[i * 3 + 2] = 0.15
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  const pondGeo = useMemo(() => new THREE.CircleGeometry(0.5, 28), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.y = Math.sin(t * 0.45) * 0.18 - 0.5
      ref.current.rotation.y = t * 0.07
    }
    if (waterRef.current) {
      const pos = waterRef.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i)
        const d = Math.sqrt(x * x + z * z)
        pos.setY(i, Math.sin(d * 10 - t * 3) * 0.006)
      }
      pos.needsUpdate = true
      ;(waterRef.current.material as THREE.MeshStandardMaterial).opacity = 0.6 + Math.sin(t * 1.2) * 0.08
    }
    crystalRefs.current.forEach((c, i) => {
      if (c) { (c.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(t * 0.9 + i) * 0.2 }
    })
  })

  return (
    <group ref={ref} position={[0, -0.5, 0]}>
      <mesh geometry={islandGeo}>
        <meshStandardMaterial vertexColors roughness={0.82} flatShading />
      </mesh>

      {/* Pond */}
      <mesh ref={waterRef} geometry={pondGeo} position={[0.8, 0.72, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#4a90d9" transparent opacity={0.65} metalness={0.9} roughness={0.02} />
      </mesh>

      {/* Trees */}
      {[[-0.9, 0.7, -0.5, 0.55], [0.5, 0.72, 0.85, 0.45], [-0.2, 0.72, 1.1, 0.4]].map(([x, y, z, s], i) => (
        <group key={i} position={[x, y, z]} scale={s as number}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.04, 0.07, 0.7, 5]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
          </mesh>
          {[0, 1].map(l => (
            <mesh key={l} position={[0, 0.75 + l * 0.3, 0]}>
              <coneGeometry args={[0.38 - l * 0.08, 0.42, 6]} />
              <meshStandardMaterial color={`hsl(${150 + l * 10},50%,${22 + l * 5}%)`} flatShading />
            </mesh>
          ))}
        </group>
      ))}

      {/* Cherry blossom */}
      <group position={[-0.3, 0.7, -1.1]} scale={0.5}>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.04, 0.07, 0.8, 5]} />
          <meshStandardMaterial color="#6b3a2a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <icosahedronGeometry args={[0.4, 1]} />
          <meshStandardMaterial color="#f9a8d4" emissive="#f472b6" emissiveIntensity={0.2} transparent opacity={0.9} roughness={0.7} flatShading />
        </mesh>
      </group>

      {/* Torii */}
      <group position={[-1.1, 0.6, 0.15]} rotation={[0, 0.7, 0]} scale={0.75}>
        {[-0.18, 0.18].map((x, i) => (
          <mesh key={i} position={[x, 0.22, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.44, 6]} />
            <meshStandardMaterial color="#c0392b" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[0.5, 0.022, 0.034]} />
          <meshStandardMaterial color="#a93226" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.49, 0]}>
          <boxGeometry args={[0.56, 0.018, 0.038]} />
          <meshStandardMaterial color="#c0392b" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}

/* ============ Crystal Field under island ============ */
function StartCrystalField() {
  const groupRef = useRef<THREE.Group>(null)
  const crystals = useMemo(() => [
    { p: [0.4, -2.0, 0.25] as [number,number,number], r: [0.2,0,0.1] as [number,number,number], s: 0.45, c: '#a78bfa' },
    { p: [-0.7, -1.8, -0.4] as [number,number,number], r: [-0.1,0.3,-0.2] as [number,number,number], s: 0.38, c: '#818cf8' },
    { p: [0.1, -2.2, -0.7] as [number,number,number], r: [0.15,-0.2,0.3] as [number,number,number], s: 0.6, c: '#c084fc' },
    { p: [-0.25, -1.7, 0.6] as [number,number,number], r: [-0.3,0.1,0.2] as [number,number,number], s: 0.32, c: '#7c3aed' },
    { p: [0.9, -2.1, -0.15] as [number,number,number], r: [0,0.5,-0.1] as [number,number,number], s: 0.42, c: '#a5b4fc' },
    { p: [-0.05, -2.4, 0.45] as [number,number,number], r: [-0.2,0.4,0] as [number,number,number], s: 0.55, c: '#e879f9' },
    { p: [-1.1, -1.9, 0.3] as [number,number,number], r: [0.1,-0.3,0.2] as [number,number,number], s: 0.28, c: '#60a5fa' },
    { p: [0.7, -1.6, 0.8] as [number,number,number], r: [-0.15,0.2,-0.1] as [number,number,number], s: 0.36, c: '#34d399' },
  ], [])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      // Offset by island Y
      child.position.y = crystals[i].p[1] + Math.sin(t * 0.45) * 0.18 - 0.5
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.28 + Math.sin(t * 0.8 + i * 0.7) * 0.18
    })
  })

  return (
    <group ref={groupRef}>
      {crystals.map((c, i) => (
        <mesh key={i} position={c.p} rotation={c.r} scale={[0.08, c.s, 0.08]}>
          <cylinderGeometry args={[0.5, 0, 1, 5]} />
          <meshStandardMaterial color={c.c} emissive={c.c} emissiveIntensity={0.3} transparent opacity={0.72} roughness={0.08} metalness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

/* ============ Particle field ============ */
function StartParticles() {
  const ref = useRef<THREE.Points>(null)
  const spiralRef = useRef<THREE.Points>(null)
  const count = 220

  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 2.5 + Math.random() * 10
      p[i * 3] = Math.cos(angle) * r
      p[i * 3 + 1] = (Math.random() - 0.5) * 8
      p[i * 3 + 2] = Math.sin(angle) * r
      const ch = Math.random()
      if (ch < 0.35) { c[i * 3] = 0.55; c[i * 3 + 1] = 0.45; c[i * 3 + 2] = 1 }
      else if (ch < 0.65) { c[i * 3] = 0.4; c[i * 3 + 1] = 0.65; c[i * 3 + 2] = 1 }
      else { c[i * 3] = 1; c[i * 3 + 1] = 0.55; c[i * 3 + 2] = 0.75 }
    }
    return { positions: p, colors: c }
  }, [])

  // Spiral
  const spiralCount = 50
  const { spiralPos, spiralCol } = useMemo(() => {
    const pos = new Float32Array(spiralCount * 3)
    const col = new Float32Array(spiralCount * 3)
    for (let i = 0; i < spiralCount; i++) {
      const t = i / spiralCount
      const a = t * Math.PI * 5
      const r = 1.5 + t * 7
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = t * 5 - 2.5; pos[i * 3 + 2] = Math.sin(a) * r
      col[i * 3] = 0.65 + t * 0.3; col[i * 3 + 1] = 0.4 + t * 0.5; col[i * 3 + 2] = 1 - t * 0.3
    }
    return { spiralPos: pos, spiralCol: col }
  }, [])

  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      const pos = ref.current.geometry.attributes.position
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const x = pos.array[i3] as number, z = pos.array[i3 + 2] as number
        const angle = Math.atan2(z, x) + 0.0005
        const dist = Math.sqrt(x * x + z * z)
        ;(pos.array as Float32Array)[i3] = Math.cos(angle) * dist
        ;(pos.array as Float32Array)[i3 + 1] += Math.sin(t * 0.35 + i) * 0.001
        ;(pos.array as Float32Array)[i3 + 2] = Math.sin(angle) * dist
        if ((pos.array[i3 + 1] as number) > 5) (pos.array as Float32Array)[i3 + 1] = -3
        if ((pos.array[i3 + 1] as number) < -3) (pos.array as Float32Array)[i3 + 1] = 5
      }
      pos.needsUpdate = true
    }
    if (spiralRef.current) {
      spiralRef.current.rotation.y = t * 0.06
    }
  })

  return (
    <>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial map={tex} size={0.065} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation vertexColors />
      </points>
      <points ref={spiralRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[spiralPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[spiralCol, 3]} />
        </bufferGeometry>
        <pointsMaterial map={tex} size={0.08} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation vertexColors />
      </points>
    </>
  )
}

/* ============ Stars ============ */
function StartStars() {
  const ref = useRef<THREE.Points>(null)
  const count = 600
  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 22 + Math.random() * 14
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      p[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 1
      p[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const ch = Math.random()
      if (ch < 0.5) { c[i * 3] = 0.88; c[i * 3 + 1] = 0.9; c[i * 3 + 2] = 1 }
      else if (ch < 0.75) { c[i * 3] = 0.7; c[i * 3 + 1] = 0.75; c[i * 3 + 2] = 1 }
      else { c[i * 3] = 1; c[i * 3 + 1] = 0.88; c[i * 3 + 2] = 0.75 }
    }
    return { positions: p, colors: c }
  }, [])
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.2, 'rgba(240,248,255,0.85)')
    g.addColorStop(0.5, 'rgba(220,230,255,0.3)')
    g.addColorStop(1, 'rgba(200,220,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 0.4
    ctx.beginPath(); ctx.moveTo(16, 3); ctx.lineTo(16, 29); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(3, 16); ctx.lineTo(29, 16); ctx.stroke()
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.000025 })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={0.12} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation vertexColors />
    </points>
  )
}

/* ============ Moon ============ */
function StartMoon() {
  const glowRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.4) * 0.04)
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(state.clock.elapsedTime * 0.4) * 0.015
    }
  })
  return (
    <group position={[-7, 12, -20]}>
      <mesh><sphereGeometry args={[1.8, 22, 22]} /><meshBasicMaterial color="#f0eaf8" /></mesh>
      {/* Craters */}
      <mesh position={[-0.5, 0.7, 1.7]}><sphereGeometry args={[0.36, 8, 8]} /><meshBasicMaterial color="#ddd4ee" transparent opacity={0.5} /></mesh>
      <mesh position={[0.4, -0.4, 1.75]}><sphereGeometry args={[0.24, 8, 8]} /><meshBasicMaterial color="#d8cde8" transparent opacity={0.4} /></mesh>
      <mesh><sphereGeometry args={[2.2, 14, 14]} /><meshBasicMaterial color="#e8d5ff" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <mesh ref={glowRef}><sphereGeometry args={[4.5, 10, 10]} /><meshBasicMaterial color="#c4b5fd" transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </group>
  )
}

/* ============ Aurora ============ */
function StartAurora() {
  const ref1 = useRef<THREE.Mesh>(null)
  const ref2 = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    ;[ref1, ref2].forEach((ref, ri) => {
      if (!ref.current) return
      const pos = ref.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const x = (pos.array as Float32Array)[i * 3]
        ;(pos.array as Float32Array)[i * 3 + 1] = Math.sin(x * 0.3 + t * (0.15 + ri * 0.08)) * 1.4
          + Math.sin(x * 0.7 + t * 0.35) * 0.5 + Math.sin(x * 0.12 + t * 0.1) * 0.8
      }
      pos.needsUpdate = true
      ;(ref.current.material as THREE.MeshBasicMaterial).opacity = (0.045 + Math.sin(t * 0.2 + ri) * 0.018)
    })
  })
  return (
    <>
      <mesh ref={ref1} position={[0, 11, -16]} rotation={[-0.28, 0, 0]}>
        <planeGeometry args={[34, 8, 42, 12]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.045} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ref2} position={[4, 10.5, -18]} rotation={[-0.32, 0.15, 0.03]}>
        <planeGeometry args={[24, 6, 28, 10]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.032} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  )
}

/* ============ Fireflies ============ */
function StartFireflies() {
  const ref = useRef<THREE.Points>(null)
  const count = 18
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const params = new Float32Array(count * 4) // ax,ay,az,speed
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = 1 + Math.random() * 3.5
      pos[i * 3] = Math.cos(angle) * r; pos[i * 3 + 1] = 0.5 + Math.random() * 2; pos[i * 3 + 2] = Math.sin(angle) * r
      const warm = Math.random() > 0.35
      col[i * 3] = warm ? 1 : 0.5; col[i * 3 + 1] = warm ? 0.88 : 1; col[i * 3 + 2] = warm ? 0.3 : 0.5
      params[i * 4] = 0.3 + Math.random() * 0.7; params[i * 4 + 1] = 0.15 + Math.random() * 0.3
      params[i * 4 + 2] = 0.3 + Math.random() * 0.6; params[i * 4 + 3] = 0.2 + Math.random() * 0.5
    }
    return { pos, col, params }
  }, [])
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 16
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    g.addColorStop(0, 'rgba(255,248,200,1)'); g.addColorStop(0.4, 'rgba(255,200,80,0.4)'); g.addColorStop(1, 'rgba(255,200,80,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16)
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame((state) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const ax = data.params[i * 4], ay = data.params[i * 4 + 1], az = data.params[i * 4 + 2], sp = data.params[i * 4 + 3]
      ;(pos.array as Float32Array)[i * 3] = data.pos[i * 3] + Math.sin(t * sp + i * 1.3) * ax
      ;(pos.array as Float32Array)[i * 3 + 1] = data.pos[i * 3 + 1] + Math.sin(t * sp * 0.7 + i * 2) * ay
      ;(pos.array as Float32Array)[i * 3 + 2] = data.pos[i * 3 + 2] + Math.cos(t * sp * 0.5 + i) * az
    }
    pos.needsUpdate = true
    ;(ref.current.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(t * 0.8) * 0.15
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.col, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={0.14} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation vertexColors />
    </points>
  )
}

/* ============ Floating rocks ============ */
function StartFloatingRocks() {
  const groupRef = useRef<THREE.Group>(null)
  const rocks = useMemo(() => [
    { p: [-6, 3, -10] as [number,number,number], s: 0.55, sp: 0.4, ph: 0 },
    { p: [7, 5, -13] as [number,number,number], s: 0.8, sp: 0.32, ph: 1.5 },
    { p: [10, 4, -8] as [number,number,number], s: 0.45, sp: 0.48, ph: 0.8 },
    { p: [-9, 6, -15] as [number,number,number], s: 0.6, sp: 0.28, ph: 2.2 },
    { p: [4, 7, -18] as [number,number,number], s: 0.38, sp: 0.55, ph: 3.1 },
  ], [])
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const r = rocks[i]
      child.position.y = r.p[1] + Math.sin(t * r.sp + r.ph) * 0.4
      child.rotation.y = t * 0.08 + r.ph
    })
  })
  return (
    <group ref={groupRef}>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} scale={r.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#1e1e30" roughness={0.92} flatShading />
        </mesh>
      ))}
    </group>
  )
}
