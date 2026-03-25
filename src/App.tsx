import { useState, useEffect, useCallback, useRef } from 'react'
import { GameScene } from './game/GameScene'
import { StartScreen } from './game/StartScreen'
import { BreathingOverlay } from './game/BreathingOverlay'
import { HUD } from './game/HUD'
import { useSoundSystem } from './game/SoundSystem'
import './App.css'

function App() {
  const [started, setStarted] = useState(false)
  const [entering, setEntering] = useState(false)
  const [breathing, setBreathing] = useState(false)
  const [score, setScore] = useState(0)
  const [calmLevel, setCalmLevel] = useState(0)
  const [poppedCount, setPoppedCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [stonesCollected, setStonesCollected] = useState(0)
  const [wisdomMessage, setWisdomMessage] = useState<string | null>(null)
  const [raining, setRaining] = useState(false)
  const [lanterns, setLanterns] = useState<{ id: number; text: string; startTime: number }[]>([])
  const [showLanternInput, setShowLanternInput] = useState(false)
  const [shockwaves, setShockwaves] = useState<{ id: number; x: number; y: number; color: string }[]>([])
  const shockwaveIdRef = useRef(0)
  const lanternIdRef = useRef(0)
  const clockRef = useRef(0)

  const { playPop, playCollect, playBreathIn, playChime } = useSoundSystem(started)

  const handleOpenBreathing = useCallback(() => {
    setBreathing(true)
    playBreathIn()
  }, [playBreathIn])

  const handleStart = useCallback(() => {
    setEntering(true)
    setTimeout(() => {
      setStarted(true)
      setEntering(false)
    }, 600)
  }, [])

  // Keep a rough clock for lantern startTime
  useEffect(() => {
    if (!started) return
    const iv = setInterval(() => { clockRef.current += 0.016 }, 16)
    return () => clearInterval(iv)
  }, [started])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!started) return
      if (showLanternInput) return
      if (e.key === ' ' && !breathing) { e.preventDefault(); handleOpenBreathing() }
      if (e.key === 'r' || e.key === 'R') setRaining(r => !r)
      if (e.key === 'l' || e.key === 'L') setShowLanternInput(true)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [started, breathing, handleOpenBreathing, showLanternInput])

  const handleBubblePopped = useCallback((comboCount: number) => {
    const mult = Math.min(comboCount, 10)
    setScore(s => s + 10 * mult)
    setPoppedCount(c => c + 1)
    setCombo(comboCount)
    setCalmLevel(l => Math.min(100, l + 3 + mult))
    playPop(comboCount)
    // Shockwave at random screen position (near center weighted)
    const id = shockwaveIdRef.current++
    const cx = 35 + Math.random() * 30
    const cy = 30 + Math.random() * 40
    const colors = ['#a78bfa', '#60a5fa', '#34d399', '#f472b6', '#fbbf24']
    const color = colors[comboCount % colors.length]
    setShockwaves(prev => [...prev, { id, x: cx, y: cy, color }])
    setTimeout(() => setShockwaves(prev => prev.filter(s => s.id !== id)), 700)
  }, [playPop])

  const handleBreathingComplete = useCallback(() => {
    setCalmLevel(l => Math.min(100, l + 20))
    setScore(s => s + 50)
  }, [])

  const handleStoneCollected = useCallback((message: string) => {
    setWisdomMessage(message)
    setStonesCollected(c => c + 1)
    setScore(s => s + 30)
    setCalmLevel(l => Math.min(100, l + 8))
    playCollect()
    setTimeout(() => setWisdomMessage(null), 4000)
  }, [playCollect])

  const handleChime = useCallback((noteIndex: number) => {
    playChime(noteIndex)
    setCalmLevel(l => Math.min(100, l + 1))
  }, [playChime])

  const handleReleaseLantern = useCallback((text: string) => {
    const id = lanternIdRef.current++
    setLanterns(prev => [...prev, { id, text, startTime: clockRef.current }])
    setCalmLevel(l => Math.min(100, l + 5))
    setScore(s => s + 20)
    setShowLanternInput(false)
    setTimeout(() => {
      setLanterns(prev => prev.filter(l => l.id !== id))
    }, 60000)
  }, [])

  return (
    <div className="app">
      {/* Start screen with fade-out on enter */}
      {!started && (
        <div style={{
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.6s ease',
          position: 'absolute', inset: 0,
        }}>
          <StartScreen onStart={handleStart} />
        </div>
      )}

      {/* Calm aura — screen-edge glow at high calm */}
      {started && calmLevel >= 60 && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 45,
          boxShadow: `inset 0 0 ${60 + (calmLevel - 60) * 2}px rgba(74,222,128,${((calmLevel - 60) / 40) * 0.08})`,
          animation: 'calmPulse 4s ease-in-out infinite',
          transition: 'box-shadow 1.5s ease',
        }} />
      )}

      {/* Rain vignette darkening */}
      {started && raining && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 44,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4,8,20,0.35) 100%)',
          animation: 'rainVignette 3s ease-in-out infinite',
        }} />
      )}

      {/* Game scene fades in */}
      {started && (
        <div style={{
          position: 'absolute', inset: 0,
          animation: 'gameEnter 0.8s ease-out forwards',
        }}>
          <GameScene
            onBubblePopped={handleBubblePopped}
            onStoneCollected={handleStoneCollected}
            onChime={handleChime}
            calmLevel={calmLevel}
            raining={raining}
            lanterns={lanterns}
          />
          <HUD
            score={score}
            calmLevel={calmLevel}
            poppedCount={poppedCount}
            combo={combo}
            stonesCollected={stonesCollected}
            onBreathingClick={handleOpenBreathing}
            onRainToggle={() => setRaining(r => !r)}
            onLanternClick={() => setShowLanternInput(true)}
            wisdomMessage={wisdomMessage}
            raining={raining}
          />
        </div>
      )}

      {/* Bubble pop shockwave rings */}
      {started && shockwaves.map(sw => (
        <div
          key={sw.id}
          style={{
            position: 'fixed',
            left: `${sw.x}%`,
            top: `${sw.y}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          {[0, 1, 2].map(ri => (
            <div
              key={ri}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8, height: 8,
                borderRadius: '50%',
                border: `2px solid ${sw.color}`,
                animation: `shockwave 0.65s cubic-bezier(0.22,0.61,0.36,1) ${ri * 0.08}s forwards`,
                boxShadow: `0 0 8px ${sw.color}`,
              }}
            />
          ))}
        </div>
      ))}

      {breathing && (
        <BreathingOverlay
          onClose={() => setBreathing(false)}
          onComplete={handleBreathingComplete}
        />
      )}

      {showLanternInput && (
        <LanternInput
          onRelease={handleReleaseLantern}
          onClose={() => setShowLanternInput(false)}
        />
      )}

      <style>{`
        @keyframes gameEnter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shockwave {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          60% { opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(6); opacity: 0; }
        }
        @keyframes calmPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes rainVignette {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function LanternInput({ onRelease, onClose }: { onRelease: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = () => {
    const wish = text.trim() || '愿一切安好'
    onRelease(wish)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
        animation: 'backdropIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(18,12,35,0.95)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,180,80,0.18)', borderRadius: '20px',
          padding: '36px 40px', textAlign: 'center', minWidth: 340,
          animation: 'lanternPanelIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 16px 60px rgba(255,120,40,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Lantern icon with glow */}
        <div style={{
          fontSize: '40px', marginBottom: 6,
          filter: 'drop-shadow(0 0 12px rgba(255,160,60,0.5))',
          animation: 'lanternFloat 2s ease-in-out infinite',
        }}>🏮</div>
        <div style={{
          color: 'rgba(255,200,120,0.65)', fontSize: '12px', letterSpacing: '4px', marginBottom: 24,
        }}>
          写下你的心愿，放飞天灯
        </div>

        {/* Suggested wishes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {['愿一切安好', '平静喜乐', '勇气与爱', '此刻幸福'].map((w) => (
            <button
              key={w}
              onClick={() => setText(w)}
              style={{
                padding: '4px 12px', fontSize: '11px', letterSpacing: '1px',
                background: text === w ? 'rgba(255,150,50,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${text === w ? 'rgba(255,150,50,0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '12px', color: text === w ? 'rgba(255,200,120,0.9)' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >{w}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="或自由输入..."
            maxLength={20}
            style={{
              flex: 1, padding: '11px 16px', fontSize: '14px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${focused ? 'rgba(255,180,80,0.45)' : 'rgba(255,180,80,0.15)'}`,
              borderRadius: '12px', color: '#ffe0b2', outline: 'none',
              letterSpacing: '2px', transition: 'border-color 0.2s',
              boxShadow: focused ? '0 0 16px rgba(255,150,50,0.1)' : 'none',
            }}
          />
          <button
            onClick={handleSubmit}
            style={{
              padding: '11px 22px', fontSize: '13px', letterSpacing: '3px',
              background: 'rgba(255,150,50,0.15)', border: '1px solid rgba(255,180,80,0.3)',
              borderRadius: '12px', color: '#ffcc80', cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,150,50,0.28)'
              e.currentTarget.style.transform = 'scale(1.06)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255,150,50,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,150,50,0.15)'
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            放 飞
          </button>
        </div>

        <div style={{
          color: 'rgba(255,255,255,0.15)', fontSize: '10px', marginTop: 16, letterSpacing: '2px',
        }}>
          按 Enter 或点击放飞 · ESC 关闭
        </div>
      </div>

      <style>{`
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lanternPanelIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lanternFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-5px) rotate(3deg); }
        }
        input::placeholder { color: rgba(255,200,120,0.25); }
      `}</style>
    </div>
  )
}

export default App
