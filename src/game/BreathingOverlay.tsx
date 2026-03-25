import { useState, useEffect, useCallback, useRef } from 'react'

interface BreathingOverlayProps {
  onClose: () => void
  onComplete: () => void
}

type Phase = 'inhale' | 'hold' | 'exhale' | 'rest'

const phases: { phase: Phase; duration: number; label: string; tip: string; color: string }[] = [
  { phase: 'inhale', duration: 4000, label: '吸 气', tip: '通过鼻子缓缓吸气...', color: '#60a5fa' },
  { phase: 'hold', duration: 4000, label: '屏 息', tip: '轻柔地保持...', color: '#a78bfa' },
  { phase: 'exhale', duration: 6000, label: '呼 气', tip: '通过嘴缓慢呼出...', color: '#34d399' },
  { phase: 'rest', duration: 2000, label: '放 松', tip: '感受平静...', color: '#fbbf24' },
]

const PARTICLE_COUNT = 28
const totalCycles = 3

export function BreathingOverlay({ onClose, onComplete }: BreathingOverlayProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [enterAnim, setEnterAnim] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const phaseRef = useRef(currentPhase)
  const progressRef = useRef(progress)
  const startedRef = useRef(started)
  const completedRef = useRef(completed)

  useEffect(() => { phaseRef.current = currentPhase }, [currentPhase])
  useEffect(() => { progressRef.current = progress }, [progress])
  useEffect(() => { startedRef.current = started }, [started])
  useEffect(() => { completedRef.current = completed }, [completed])

  useEffect(() => {
    setTimeout(() => setEnterAnim(true), 50)
  }, [])

  const startExercise = useCallback(() => {
    setStarted(true)
    setCurrentPhase(0)
    setCycle(0)
    setProgress(0)
  }, [])

  useEffect(() => {
    if (!started || completed) return
    const phase = phases[currentPhase]
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const p = Math.min(1, elapsed / phase.duration)
      setProgress(p)
      if (p >= 1) {
        clearInterval(interval)
        const nextPhase = currentPhase + 1
        if (nextPhase >= phases.length) {
          const nextCycle = cycle + 1
          if (nextCycle >= totalCycles) {
            setCompleted(true)
            onComplete()
            setTimeout(onClose, 2500)
            return
          }
          setCycle(nextCycle)
          setCurrentPhase(0)
        } else {
          setCurrentPhase(nextPhase)
        }
        setProgress(0)
      }
    }, 30)
    return () => clearInterval(interval)
  }, [started, completed, currentPhase, cycle, onClose, onComplete])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && !started) { e.preventDefault(); startExercise() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, started, startExercise])

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = 560
    const H = canvas.height = 560
    const cx = W / 2, cy = H / 2

    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      angle: (i / PARTICLE_COUNT) * Math.PI * 2,
      r: 130 + (i % 3) * 22,
      speed: 0.18 + (i % 5) * 0.06,
      size: 1.5 + (i % 4) * 1.2,
      hueOffset: (i / PARTICLE_COUNT) * 60,
      opacity: 0.3 + (i % 3) * 0.2,
      trail: [] as { x: number; y: number }[],
    }))

    let t = 0
    function draw() {
      animFrameRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, W, H)
      t += 0.016

      if (!startedRef.current) return

      const ph = phaseRef.current
      const pr = progressRef.current
      const phaseData = phases[ph]
      const color = phaseData?.color || '#60a5fa'

      const baseScale = ph === 0 ? 1 + pr * 0.6
        : ph === 1 ? 1.6
        : ph === 2 ? 1.6 - pr * 0.6
        : 1

      // Draw outer aurora rings
      for (let ring = 3; ring >= 1; ring--) {
        const ringR = 105 * baseScale + ring * 18
        const grd = ctx.createRadialGradient(cx, cy, ringR - 8, cx, cy, ringR + 8)
        const alpha = (0.03 + pr * 0.04) / ring
        grd.addColorStop(0, `${color}00`)
        grd.addColorStop(0.5, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
        grd.addColorStop(1, `${color}00`)
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = grd
        ctx.lineWidth = 16
        ctx.stroke()
      }

      // Main circle glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110 * baseScale)
      const innerAlpha = 0.08 + pr * 0.10
      grd.addColorStop(0, `${color}${Math.round(innerAlpha * 255).toString(16).padStart(2, '0')}`)
      grd.addColorStop(0.6, `${color}${Math.round(innerAlpha * 0.4 * 255).toString(16).padStart(2, '0')}`)
      grd.addColorStop(1, `${color}00`)
      ctx.beginPath()
      ctx.arc(cx, cy, 110 * baseScale, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()

      // Circle border
      ctx.beginPath()
      ctx.arc(cx, cy, 105 * baseScale, 0, Math.PI * 2)
      ctx.strokeStyle = `${color}${Math.round((0.2 + pr * 0.35) * 255).toString(16).padStart(2, '0')}`
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Progress arc
      ctx.beginPath()
      ctx.arc(cx, cy, 105 * baseScale, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Orbiting particles
      particles.forEach((p) => {
        p.angle += p.speed * 0.008
        const orbitR = p.r * baseScale
        const px = cx + Math.cos(p.angle) * orbitR
        const py = cy + Math.sin(p.angle) * orbitR

        p.trail.unshift({ x: px, y: py })
        if (p.trail.length > 8) p.trail.pop()

        // Trail
        p.trail.forEach((pt, ti) => {
          const trailAlpha = (1 - ti / p.trail.length) * p.opacity * 0.4
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, p.size * (1 - ti / p.trail.length * 0.7), 0, Math.PI * 2)
          ctx.fillStyle = `${color}${Math.round(trailAlpha * 255).toString(16).padStart(2, '0')}`
          ctx.fill()
        })

        // Main dot
        const pGrd = ctx.createRadialGradient(px, py, 0, px, py, p.size * 2)
        pGrd.addColorStop(0, color)
        pGrd.addColorStop(1, `${color}00`)
        ctx.beginPath()
        ctx.arc(px, py, p.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = pGrd
        ctx.fill()

        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity * 0.9})`
        ctx.fill()
      })

      // Completion starburst
      if (completedRef.current) {
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2 + t * 0.5
          const len = 60 + Math.sin(t * 3 + i) * 20
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20)
          ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
          ctx.strokeStyle = `hsla(${120 + i * 8}, 80%, 70%, ${0.15 + Math.sin(t * 2 + i) * 0.08})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }
    }
    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [started])

  const phase = phases[currentPhase]
  const phaseColor = phase?.color || '#60a5fa'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(3, 4, 18, 0.96)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(30px)',
      opacity: enterAnim ? 1 : 0, transition: 'opacity 0.4s ease',
    }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 24, right: 24,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.35)', fontSize: '18px', cursor: 'pointer',
        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
      >✕</button>

      {/* Header */}
      <div style={{
        color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '5px', marginBottom: 20,
        textTransform: 'uppercase',
      }}>
        {started ? `第 ${cycle + 1} / ${totalCycles} 轮` : '4-4-6 呼吸冥想'}
      </div>

      {/* Phase progress strips */}
      {started && !completed && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' }}>
          {phases.map((p, i) => {
            const isActive = i === currentPhase
            const isDone = i < currentPhase || (i === 0 && currentPhase === 0 && progress === 0 && cycle > 0)
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 3, borderRadius: 2, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: isActive ? `0 0 8px ${p.color}44` : 'none',
                }}>
                  <div style={{
                    width: isActive ? `${progress * 100}%` : isDone ? '100%' : '0%',
                    height: '100%',
                    background: isActive ? p.color : `${p.color}55`,
                    transition: isActive ? 'none' : 'width 0.4s ease',
                    borderRadius: 2,
                    boxShadow: isActive ? `0 0 6px ${p.color}` : 'none',
                  }} />
                </div>
                <div style={{
                  color: isActive ? p.color : 'rgba(255,255,255,0.2)',
                  fontSize: '10px', marginTop: 5, letterSpacing: '1px',
                  transition: 'color 0.3s',
                  textShadow: isActive ? `0 0 8px ${p.color}` : 'none',
                }}>
                  {p.label}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Canvas breathing circle */}
      <div style={{ position: 'relative', width: 280, height: 280 }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 280, height: 280,
            borderRadius: '50%',
          }}
        />
        {/* Text overlay in the center */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: '28px', fontWeight: 200, letterSpacing: '8px',
            color: completed ? '#4ade80' : started ? phaseColor : 'rgba(180,210,255,0.7)',
            textShadow: `0 0 20px ${completed ? '#4ade80' : phaseColor}88`,
            transition: 'color 0.6s, text-shadow 0.6s',
            animation: started ? 'phaseIn 0.4s ease-out' : 'none',
          }}>
            {completed ? '完 成' : started ? phase.label : '准 备'}
          </span>
          {started && !completed && (
            <span style={{
              fontSize: '11px', color: `${phaseColor}88`, marginTop: 12,
              letterSpacing: '2px', transition: 'color 0.6s',
            }}>
              {phase.tip}
            </span>
          )}
          {!started && (
            <span style={{
              fontSize: '12px', color: 'rgba(180,210,255,0.25)',
              marginTop: 8, letterSpacing: '2px',
            }}>
              点击开始
            </span>
          )}
        </div>
      </div>

      {/* Completed message */}
      {completed && (
        <div style={{
          color: '#4ade80', fontSize: '15px', letterSpacing: '4px', marginTop: 28, fontWeight: 300,
          animation: 'completeFadeIn 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          textShadow: '0 0 20px rgba(74,222,128,0.5)',
        }}>
          ✦ 呼吸练习完成 · 平静度 +20 ✦
        </div>
      )}

      {/* Cycle dots */}
      {started && !completed && (
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {Array.from({ length: totalCycles }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < cycle ? phaseColor : i === cycle ? `${phaseColor}55` : 'rgba(255,255,255,0.07)',
              boxShadow: i === cycle ? `0 0 8px ${phaseColor}88` : 'none',
              transition: 'background 0.4s, box-shadow 0.4s',
            }} />
          ))}
        </div>
      )}

      {/* Start area */}
      {!started && (
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <div style={{
            color: 'rgba(200,180,255,0.3)', fontSize: '12px', letterSpacing: '2px', marginBottom: 24,
            lineHeight: 2.2,
          }}>
            吸气 4 秒 &nbsp;·&nbsp; 屏息 4 秒 &nbsp;·&nbsp; 呼气 6 秒<br />
            重复 3 轮，帮助你恢复平静
          </div>
          <button onClick={startExercise} style={{
            padding: '14px 52px', fontSize: '14px', letterSpacing: '6px',
            background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
            color: 'rgba(180,210,255,0.85)', borderRadius: '32px', cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 0 24px rgba(96,165,250,0.1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(96,165,250,0.2)'
            e.currentTarget.style.boxShadow = '0 0 32px rgba(96,165,250,0.25)'
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.borderColor = 'rgba(96,165,250,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(96,165,250,0.1)'
            e.currentTarget.style.boxShadow = '0 0 24px rgba(96,165,250,0.1)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.borderColor = 'rgba(96,165,250,0.25)'
          }}
          >
            开始呼吸
          </button>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 28,
        color: 'rgba(255,255,255,0.15)', fontSize: '11px', letterSpacing: '2px',
      }}>
        跟随圆圈的节奏呼吸 · 按 ESC 返回
      </div>

      <style>{`
        @keyframes phaseIn {
          from { opacity: 0; transform: scale(0.85) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes completeFadeIn {
          from { opacity: 0; transform: scale(0.8) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
