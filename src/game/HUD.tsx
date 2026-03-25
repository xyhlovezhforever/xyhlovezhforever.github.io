import { useState, useEffect, useRef } from 'react'

interface HUDProps {
  score: number
  calmLevel: number
  poppedCount: number
  combo: number
  stonesCollected: number
  onBreathingClick: () => void
  onRainToggle: () => void
  onLanternClick: () => void
  wisdomMessage: string | null
  raining: boolean
}

export function HUD({
  score, calmLevel, poppedCount, combo, stonesCollected,
  onBreathingClick, onRainToggle, onLanternClick, wisdomMessage, raining,
}: HUDProps) {
  const [showWisdom, setShowWisdom] = useState(false)
  const [displayedWisdom, setDisplayedWisdom] = useState('')
  const [displayScore, setDisplayScore] = useState(score)
  const [displayPopped, setDisplayPopped] = useState(poppedCount)
  const [comboKey, setComboKey] = useState(0)
  const prevScoreRef = useRef(score)
  const prevPoppedRef = useRef(poppedCount)

  useEffect(() => {
    if (wisdomMessage) {
      setDisplayedWisdom(wisdomMessage)
      setShowWisdom(true)
      const timer = setTimeout(() => setShowWisdom(false), 4500)
      return () => clearTimeout(timer)
    }
  }, [wisdomMessage])

  // Animated score counter
  useEffect(() => {
    if (score === prevScoreRef.current) return
    prevScoreRef.current = score
    const diff = score - displayScore
    const steps = 12
    let step = 0
    const interval = setInterval(() => {
      step++
      setDisplayScore(prev => prev + Math.ceil(diff / (steps - step + 1)))
      if (step >= steps) clearInterval(interval)
    }, 40)
    return () => clearInterval(interval)
  }, [score])

  // Animated popped counter
  useEffect(() => {
    if (poppedCount === prevPoppedRef.current) return
    prevPoppedRef.current = poppedCount
    const timer = setTimeout(() => setDisplayPopped(poppedCount), 200)
    return () => clearTimeout(timer)
  }, [poppedCount])

  useEffect(() => {
    if (combo > 1) setComboKey(k => k + 1)
  }, [combo])

  const calmColor = calmLevel > 70
    ? '#4ade80' : calmLevel > 40
    ? '#fbbf24' : '#f87171'

  const calmBg = calmLevel > 70
    ? 'rgba(74,222,128,0.06)' : calmLevel > 40
    ? 'rgba(251,191,36,0.06)' : 'rgba(248,113,113,0.06)'

  return (
    <>
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none', zIndex: 100,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)',
      }}>
        {/* Score */}
        <div style={{
          color: 'rgba(255,255,255,0.9)', letterSpacing: '1px',
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
          padding: '8px 16px', minWidth: 90,
        }}>
          <div style={{ opacity: 0.45, marginBottom: 3, fontSize: '10px', letterSpacing: '2px' }}>平静分数</div>
          <div style={{
            fontSize: '28px', fontWeight: 200, letterSpacing: '1px',
            textShadow: '0 0 20px rgba(160,120,255,0.4)',
            transition: 'color 0.3s',
          }}>{displayScore}</div>
          {combo > 1 && (
            <div
              key={comboKey}
              style={{
                color: '#fbbf24', fontSize: '13px', fontWeight: 600, marginTop: 3,
                animation: 'comboFlash 0.4s ease-out',
                textShadow: '0 0 12px rgba(251,191,36,0.6)',
              }}
            >
              ✦ {combo}x 连击!
            </div>
          )}
        </div>

        {/* Calm meter - center */}
        <div style={{
          textAlign: 'center', flex: 1, maxWidth: 300,
          background: calmBg, backdropFilter: 'blur(8px)',
          border: `1px solid ${calmColor}22`, borderRadius: '16px',
          padding: '10px 20px', margin: '0 16px',
          transition: 'background 0.8s, border-color 0.8s',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', letterSpacing: '3px', marginBottom: 8 }}>
            内心平静度
          </div>
          {/* Calm bar with shine */}
          <div style={{ position: 'relative', width: '100%', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${calmLevel}%`, height: '100%',
              background: `linear-gradient(90deg, ${calmColor}66, ${calmColor})`,
              borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: `0 0 12px ${calmColor}55, 0 0 24px ${calmColor}22`,
            }} />
            {/* Shine overlay */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
              background: 'rgba(255,255,255,0.08)', borderRadius: '4px 4px 0 0',
            }} />
          </div>
          <div style={{
            color: calmColor, fontSize: '22px', fontWeight: 200, marginTop: 6,
            transition: 'color 0.6s', textShadow: `0 0 16px ${calmColor}66`,
            letterSpacing: '2px',
          }}>
            {calmLevel}%
          </div>
          {/* Calm level label */}
          <div style={{ fontSize: '10px', color: calmColor, opacity: 0.5, marginTop: 2, letterSpacing: '1px' }}>
            {calmLevel >= 80 ? '极度平静' : calmLevel >= 60 ? '平静舒适' : calmLevel >= 40 ? '渐趋平静' : calmLevel >= 20 ? '开始放松' : '需要平静'}
          </div>
        </div>

        {/* Stats right */}
        <div style={{
          color: 'rgba(255,255,255,0.9)', letterSpacing: '1px', textAlign: 'right',
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
          padding: '8px 16px', minWidth: 90,
        }}>
          <div style={{ opacity: 0.45, marginBottom: 3, fontSize: '10px', letterSpacing: '2px' }}>已消除焦虑</div>
          <div style={{
            fontSize: '28px', fontWeight: 200,
            animation: displayPopped !== poppedCount ? 'countBounce 0.3s ease-out' : undefined,
          }}>{displayPopped}</div>
          <div style={{
            fontSize: '11px', marginTop: 3,
            color: stonesCollected > 0 ? 'rgba(167,139,250,0.8)' : 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
          }}>
            <span style={{ fontSize: '13px' }}>💎</span>
            <span>{stonesCollected}</span>
            <span style={{ opacity: 0.6 }}>冥想石</span>
          </div>
        </div>
      </div>

      {/* Wisdom message popup */}
      {showWisdom && (
        <div style={{
          position: 'fixed', top: '45%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(80,40,160,0.18)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(160,120,255,0.25)', borderRadius: '20px',
          padding: '28px 48px', color: '#ede9fe', fontSize: '20px', fontWeight: 300,
          letterSpacing: '2px', textAlign: 'center', zIndex: 150, pointerEvents: 'none',
          animation: 'wisdomAppear 0.5s cubic-bezier(0.34,1.56,0.64,1)', maxWidth: '420px',
          boxShadow: '0 8px 40px rgba(120,80,255,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: 14, animation: 'gemSpin 2s linear infinite' }}>💎</div>
          <div style={{ lineHeight: 1.8 }}>{displayedWisdom}</div>
          <div style={{
            marginTop: 14, display: 'flex', gap: 4, justifyContent: 'center',
            opacity: 0.3,
          }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: '50%', background: '#a78bfa',
                animation: `dotPulse 1.5s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 10, zIndex: 100,
        padding: '8px 12px',
        background: 'rgba(10,8,30,0.35)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <ToolButton onClick={onBreathingClick} icon="🫁" label="深呼吸" shortcut="空格" color="#60a5fa" />
        <ToolButton onClick={onLanternClick} icon="🏮" label="天灯" shortcut="L" color="#fbbf24" />
        <ToolButton
          onClick={onRainToggle}
          icon={raining ? '☀️' : '🌧️'}
          label={raining ? '放晴' : '听雨'}
          shortcut="R"
          active={raining}
          color="#4ade80"
        />
      </div>

      {/* Tips */}
      <div style={{
        position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.18)', fontSize: '11px', letterSpacing: '2px',
        pointerEvents: 'none', zIndex: 100, whiteSpace: 'nowrap',
      }}>
        点击气泡 · 收集冥想石 · 点击风铃 · 放飞心愿天灯
      </div>

      <style>{`
        @keyframes comboFlash {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes countBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); color: #fbbf24; }
          100% { transform: scale(1); }
        }
        @keyframes wisdomAppear {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.88); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes gemSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.6); opacity: 0.7; }
        }
        @keyframes btnGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(255,255,255,0); }
          50% { box-shadow: 0 0 12px rgba(255,255,255,0.1); }
        }
      `}</style>
    </>
  )
}

function ToolButton({ onClick, icon, label, shortcut, active, color }: {
  onClick: () => void; icon: string; label: string; shortcut: string; active?: boolean; color?: string
}) {
  const c = color || '#a78bfa'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px', fontSize: '12px', letterSpacing: '1px',
        background: active ? `${c}25` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${c}55` : 'rgba(255,255,255,0.08)'}`,
        color: active ? `${c}ee` : 'rgba(220,210,255,0.75)',
        borderRadius: '24px', cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: active ? `0 0 14px ${c}30` : 'none',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = active ? `${c}35` : 'rgba(255,255,255,0.1)'
        e.currentTarget.style.borderColor = active ? `${c}77` : 'rgba(255,255,255,0.18)'
        e.currentTarget.style.transform = 'scale(1.06) translateY(-1px)'
        e.currentTarget.style.boxShadow = `0 4px 20px ${c}30`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = active ? `${c}25` : 'rgba(255,255,255,0.04)'
        e.currentTarget.style.borderColor = active ? `${c}55` : 'rgba(255,255,255,0.08)'
        e.currentTarget.style.transform = 'scale(1) translateY(0px)'
        e.currentTarget.style.boxShadow = active ? `0 0 14px ${c}30` : 'none'
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
      <span style={{ fontWeight: 300 }}>{label}</span>
      <span style={{
        fontSize: '9px', opacity: 0.3,
        background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px',
        letterSpacing: '0.5px',
      }}>{shortcut}</span>
    </button>
  )
}
