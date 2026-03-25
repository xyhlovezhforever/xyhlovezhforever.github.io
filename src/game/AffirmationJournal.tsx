import { useState, useEffect, useRef } from 'react'

interface AffirmationJournalProps {
  onClose: () => void
  collectedMessages: string[]
  calmLevel: number
}

const dailyAffirmations = [
  '今天的我，已经足够好了。',
  '我选择放下不属于我的烦恼。',
  '我值得拥有平静和幸福。',
  '每一次呼吸，都在为我带来力量。',
  '我正在以自己的节奏成长。',
  '我允许自己犯错，因为这是成长的一部分。',
  '我的价值不取决于他人的评价。',
  '此刻，一切都是恰到好处的。',
  '我拥有面对任何挑战的能力。',
  '我选择善待自己，就像善待好朋友一样。',
]

export function AffirmationJournal({ onClose, collectedMessages, calmLevel }: AffirmationJournalProps) {
  const [activeTab, setActiveTab] = useState<'affirmation' | 'collection' | 'gratitude'>('affirmation')
  const [todayAffirmation] = useState(() =>
    dailyAffirmations[Math.floor(Math.random() * dailyAffirmations.length)]
  )
  const [gratitudeText, setGratitudeText] = useState('')
  const [gratitudes, setGratitudes] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleAddGratitude = () => {
    if (gratitudeText.trim()) {
      setGratitudes(prev => [...prev, gratitudeText.trim()])
      setGratitudeText('')
      inputRef.current?.focus()
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    fontSize: '13px',
    letterSpacing: '2px',
    background: active ? 'rgba(120,80,200,0.2)' : 'transparent',
    border: `1px solid ${active ? 'rgba(160,120,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
    color: active ? '#c8b4ff' : 'rgba(200,180,255,0.4)',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  })

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,5,20,0.92)',
        backdropFilter: 'blur(20px)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '60px',
        animation: 'fadeIn 0.3s ease',
      }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20,
        background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.4)', fontSize: '24px', cursor: 'pointer',
      }}>✕</button>

      <h2 style={{
        color: '#e8d5f5', fontSize: '24px', fontWeight: 300,
        letterSpacing: '6px', marginBottom: 24,
      }}>
        心灵日记
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
        <button style={tabStyle(activeTab === 'affirmation')} onClick={() => setActiveTab('affirmation')}>
          今日肯定
        </button>
        <button style={tabStyle(activeTab === 'collection')} onClick={() => setActiveTab('collection')}>
          智慧收集 ({collectedMessages.length})
        </button>
        <button style={tabStyle(activeTab === 'gratitude')} onClick={() => setActiveTab('gratitude')}>
          感恩记录
        </button>
      </div>

      {/* Content */}
      <div style={{
        width: '100%',
        maxWidth: 500,
        padding: '0 20px',
        flex: 1,
        overflowY: 'auto',
      }}>
        {activeTab === 'affirmation' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 20 }}>🌸</div>
            <div style={{
              color: '#e8d5f5',
              fontSize: '20px',
              fontWeight: 300,
              lineHeight: 1.8,
              letterSpacing: '2px',
              padding: '30px',
              background: 'rgba(120,80,200,0.08)',
              borderRadius: '16px',
              border: '1px solid rgba(160,120,255,0.15)',
            }}>
              "{todayAffirmation}"
            </div>
            <div style={{
              color: 'rgba(200,180,255,0.4)',
              fontSize: '12px',
              marginTop: 20,
              letterSpacing: '2px',
            }}>
              内心平静度: {calmLevel}%
            </div>
            {/* Progress visualization */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 4,
              marginTop: 16,
            }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{
                  width: 8,
                  height: 30 + (i < calmLevel / 10 ? (calmLevel / 10 - i) * 3 : 0),
                  background: i < calmLevel / 10
                    ? `hsl(${260 + i * 10}, 60%, ${40 + i * 3}%)`
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: 4,
                  transition: 'all 0.5s ease',
                }} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'collection' && (
          <div>
            {collectedMessages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'rgba(200,180,255,0.4)',
                fontSize: '14px',
                marginTop: 40,
              }}>
                还没有收集到冥想石的智慧<br />
                <span style={{ fontSize: '12px' }}>点击场景中漂浮的发光宝石来收集</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {collectedMessages.map((msg, i) => (
                  <div key={i} style={{
                    padding: '16px 20px',
                    background: 'rgba(120,80,200,0.08)',
                    border: '1px solid rgba(160,120,255,0.15)',
                    borderRadius: '12px',
                    color: '#e8d5f5',
                    fontSize: '15px',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <span style={{ fontSize: '20px' }}>💎</span>
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'gratitude' && (
          <div>
            <div style={{
              display: 'flex',
              gap: 10,
              marginBottom: 20,
            }}>
              <input
                ref={inputRef}
                type="text"
                value={gratitudeText}
                onChange={e => setGratitudeText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddGratitude()}
                placeholder="今天你感恩什么..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(160,120,255,0.2)',
                  borderRadius: '10px',
                  color: '#e8d5f5',
                  outline: 'none',
                  letterSpacing: '1px',
                }}
              />
              <button
                onClick={handleAddGratitude}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  background: 'rgba(120,80,200,0.2)',
                  border: '1px solid rgba(160,120,255,0.3)',
                  borderRadius: '10px',
                  color: '#c8b4ff',
                  cursor: 'pointer',
                }}
              >
                记录
              </button>
            </div>
            {gratitudes.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'rgba(200,180,255,0.3)',
                fontSize: '13px',
                marginTop: 30,
              }}>
                记录让你感恩的事物<br />
                感恩练习能有效减轻焦虑
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gratitudes.map((g, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: 'rgba(52,211,153,0.06)',
                    border: '1px solid rgba(52,211,153,0.15)',
                    borderRadius: '10px',
                    color: 'rgba(200,230,210,0.8)',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span>🙏</span> {g}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 30,
        color: 'rgba(255,255,255,0.2)',
        fontSize: '12px',
        letterSpacing: '2px',
      }}>
        按 ESC 返回
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        input::placeholder {
          color: rgba(200,180,255,0.3);
        }
      `}</style>
    </div>
  )
}
