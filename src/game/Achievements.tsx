import { useState, useEffect, useCallback } from 'react'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  timestamp?: number
}

const achievementDefs: Omit<Achievement, 'unlocked' | 'timestamp'>[] = [
  { id: 'first_pop', title: '初次释放', description: '消除第一个焦虑气泡', icon: '🫧' },
  { id: 'pop_10', title: '平静初现', description: '消除10个焦虑气泡', icon: '✨' },
  { id: 'pop_50', title: '心灵战士', description: '消除50个焦虑气泡', icon: '⚔️' },
  { id: 'pop_100', title: '焦虑终结者', description: '消除100个焦虑气泡', icon: '🏆' },
  { id: 'combo_3', title: '连锁反应', description: '达成3连击', icon: '💥' },
  { id: 'combo_5', title: '势如破竹', description: '达成5连击', icon: '🔥' },
  { id: 'combo_10', title: '无人能挡', description: '达成10连击', icon: '⚡' },
  { id: 'calm_25', title: '初见宁静', description: '平静度达到25%', icon: '🌱' },
  { id: 'calm_50', title: '内心平和', description: '平静度达到50%', icon: '🌿' },
  { id: 'calm_75', title: '禅意盎然', description: '平静度达到75%', icon: '🧘' },
  { id: 'calm_100', title: '大彻大悟', description: '平静度达到100%', icon: '🪷' },
  { id: 'breath_1', title: '深呼吸', description: '完成一次呼吸练习', icon: '🫁' },
  { id: 'breath_3', title: '呼吸大师', description: '完成三次呼吸练习', icon: '🌬️' },
  { id: 'stone_1', title: '智慧启示', description: '收集第一颗冥想石', icon: '💎' },
  { id: 'stone_5', title: '收藏家', description: '收集5颗冥想石', icon: '🔮' },
  { id: 'stone_8', title: '大智慧', description: '收集全部冥想石', icon: '👁️' },
  { id: 'score_500', title: '寻路者', description: '分数达到500', icon: '🗺️' },
  { id: 'score_1000', title: '开悟者', description: '分数达到1000', icon: '☀️' },
]

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(() =>
    achievementDefs.map(a => ({ ...a, unlocked: false }))
  )
  const [notification, setNotification] = useState<Achievement | null>(null)

  const unlock = useCallback((id: string) => {
    setAchievements(prev => {
      const existing = prev.find(a => a.id === id)
      if (!existing || existing.unlocked) return prev
      return prev.map(a =>
        a.id === id ? { ...a, unlocked: true, timestamp: Date.now() } : a
      )
    })
    const def = achievementDefs.find(a => a.id === id)
    if (def) {
      setNotification({ ...def, unlocked: true, timestamp: Date.now() })
    }
  }, [])

  // Auto-clear notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [notification])

  return { achievements, unlock, notification }
}

export function AchievementNotification({ achievement }: { achievement: Achievement | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (achievement) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [achievement])

  if (!achievement || !visible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      animation: 'achieveSlide 0.5s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(120,80,200,0.3), rgba(60,40,120,0.4))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(160,120,255,0.3)',
        borderRadius: '16px',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(120,80,200,0.3)',
      }}>
        <span style={{ fontSize: '32px' }}>{achievement.icon}</span>
        <div>
          <div style={{
            color: '#fbbf24',
            fontSize: '11px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            成就解锁
          </div>
          <div style={{
            color: '#e8d5f5',
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '1px',
          }}>
            {achievement.title}
          </div>
          <div style={{
            color: 'rgba(200,180,255,0.6)',
            fontSize: '12px',
            marginTop: 2,
          }}>
            {achievement.description}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes achieveSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

export function AchievementPanel({ achievements, onClose }: {
  achievements: Achievement[]
  onClose: () => void
}) {
  const unlocked = achievements.filter(a => a.unlocked).length

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,5,20,0.9)',
        backdropFilter: 'blur(20px)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}>
      <button onClick={onClose} style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '24px',
        cursor: 'pointer',
      }}>✕</button>

      <h2 style={{
        color: '#e8d5f5',
        fontSize: '28px',
        fontWeight: 300,
        letterSpacing: '6px',
        marginBottom: 8,
      }}>
        成就
      </h2>
      <div style={{
        color: 'rgba(200,180,255,0.5)',
        fontSize: '13px',
        letterSpacing: '2px',
        marginBottom: 30,
      }}>
        已解锁 {unlocked} / {achievements.length}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        maxWidth: '600px',
        maxHeight: '60vh',
        overflowY: 'auto',
        padding: '0 20px',
      }}>
        {achievements.map(a => (
          <div key={a.id} style={{
            background: a.unlocked
              ? 'linear-gradient(135deg, rgba(120,80,200,0.2), rgba(60,40,120,0.25))'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${a.unlocked ? 'rgba(160,120,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            opacity: a.unlocked ? 1 : 0.4,
            transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: '28px', marginBottom: 8, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>
              {a.icon}
            </div>
            <div style={{
              color: a.unlocked ? '#e8d5f5' : 'rgba(255,255,255,0.4)',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: 4,
            }}>
              {a.title}
            </div>
            <div style={{
              color: 'rgba(200,180,255,0.4)',
              fontSize: '11px',
            }}>
              {a.description}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
