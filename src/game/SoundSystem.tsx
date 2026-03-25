import { useEffect, useRef, useCallback } from 'react'

// Web Audio API based ambient sound generator
export function useSoundSystem(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{
    master: GainNode
    ambient: OscillatorNode[]
    ambientGains: GainNode[]
  } | null>(null)
  const startedRef = useRef(false)

  const initAudio = useCallback(() => {
    if (startedRef.current || !enabled) return
    startedRef.current = true

    const ctx = new AudioContext()
    ctxRef.current = ctx

    const master = ctx.createGain()
    master.gain.value = 0.15
    master.connect(ctx.destination)

    // Create ambient drone - layered oscillators for meditation sound
    const ambient: OscillatorNode[] = []
    const ambientGains: GainNode[] = []

    // Base drone
    const freqs = [55, 82.5, 110, 165, 220] // A harmonics
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = i === 0 ? 'sine' : i < 3 ? 'triangle' : 'sine'
      osc.frequency.value = freq
      gain.gain.value = i === 0 ? 0.08 : 0.03 / (i + 1)

      // Slow LFO for movement
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.1 + i * 0.05
      lfoGain.gain.value = 0.5 + i * 0.2
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()

      osc.connect(gain)
      gain.connect(master)
      osc.start()
      ambient.push(osc)
      ambientGains.push(gain)
    })

    // Wind-like noise
    const bufferSize = ctx.sampleRate * 4
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch)
      let prev = 0
      for (let i = 0; i < bufferSize; i++) {
        // Brown noise (smoother, more wind-like)
        prev = (prev + (Math.random() * 2 - 1) * 0.02) * 0.998
        data[i] = prev
      }
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.06
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = 400
    noiseFilter.Q.value = 0.5
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    noise.start()

    nodesRef.current = { master, ambient, ambientGains }
  }, [enabled])

  // Play pop sound
  const playPop = useCallback((combo: number) => {
    if (!ctxRef.current) return
    const ctx = ctxRef.current
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    // Higher pitch for higher combos
    const baseFreq = 400 + combo * 80
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 0.05)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.3)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(ctxRef.current.destination)
    osc.start(now)
    osc.stop(now + 0.3)

    // Sparkle
    if (combo > 1) {
      const sparkle = ctx.createOscillator()
      const sg = ctx.createGain()
      sparkle.type = 'sine'
      sparkle.frequency.setValueAtTime(1200 + combo * 200, now + 0.05)
      sparkle.frequency.exponentialRampToValueAtTime(2000 + combo * 300, now + 0.15)
      sg.gain.setValueAtTime(0.08, now + 0.05)
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      sparkle.connect(sg)
      sg.connect(ctx.destination)
      sparkle.start(now + 0.05)
      sparkle.stop(now + 0.25)
    }
  }, [])

  // Play collect sound (for meditation stones)
  const playCollect = useCallback(() => {
    if (!ctxRef.current) return
    const ctx = ctxRef.current
    const now = ctx.currentTime

    // Ethereal bell-like sound
    const harmonics = [523.25, 659.25, 783.99, 1046.5] // C major
    harmonics.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.1 / (i + 1), now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1 + i * 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + 1.5)
    })
  }, [])

  // Play breathing sound
  const playBreathIn = useCallback(() => {
    if (!ctxRef.current) return
    const ctx = ctxRef.current
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 200
    osc.frequency.linearRampToValueAtTime(280, now + 4)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.05, now + 2)
    gain.gain.linearRampToValueAtTime(0.02, now + 4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 4)
  }, [])

  useEffect(() => {
    const handleInteraction = () => {
      initAudio()
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close()
      }
    }
  }, [initAudio])

  // Play wind chime
  const playChime = useCallback((noteIndex: number) => {
    if (!ctxRef.current) return
    const ctx = ctxRef.current
    const now = ctx.currentTime
    const freqs = [523.25, 587.33, 659.25, 783.99, 880.00]
    const freq = freqs[noteIndex] || 523.25
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 2)
    // Overtone
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    o2.type = 'sine'
    o2.frequency.value = freq * 2.5
    g2.gain.setValueAtTime(0.03, now)
    g2.gain.exponentialRampToValueAtTime(0.001, now + 1)
    o2.connect(g2)
    g2.connect(ctx.destination)
    o2.start(now)
    o2.stop(now + 1)
  }, [])

  // Play rain sound
  const playRainToggle = useCallback((_on: boolean) => {
    if (!ctxRef.current || !nodesRef.current) return
    // Adjust wind noise volume to simulate rain
    // Rain is already handled by the ambient noise filter
  }, [])

  return { playPop, playCollect, playBreathIn, playChime, playRainToggle }
}
