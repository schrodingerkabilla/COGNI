import { useState } from 'react'
import { TOPICS } from '../data'
import * as api from '../api'

interface Props {
  onDone: () => void
}

const LEVELS = [
  { value: 1, label: 'Just started',      color: '#ff3d6b' },
  { value: 2, label: 'Getting there',     color: '#f59e0b' },
  { value: 3, label: 'Pretty comfortable', color: '#60d4ff' },
  { value: 4, label: 'Confident',         color: '#06d6a0' },
  { value: 5, label: 'Mastered',          color: '#c4b5fd' },
]

export default function OnboardingPage({ onDone }: Props) {
  const [conf, setConf]     = useState<Record<string, number>>(() =>
    Object.fromEntries(TOPICS.map(t => [t.id, 3]))
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function submit() {
    setLoading(true)
    setError('')
    try {
      await api.saveOnboarding(
        TOPICS.map(t => ({ topic_id: t.id, initial_confidence: conf[t.id] }))
      )
      onDone()
    } catch {
      setError('Could not save — is the backend running?')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#03080f', padding: '32px 16px',
    }}>
      {/* Aurora orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'rgba(0,120,255,0.10)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'rgba(100,0,255,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontSize: 34, fontWeight: 900, letterSpacing: '-0.8px',
            background: 'linear-gradient(135deg, #ffffff 0%, #60d4ff 45%, #0088ff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            What are you studying?
          </div>
          <div style={{ fontSize: 14, color: 'rgba(0,190,255,0.5)', marginTop: 8 }}>
            Rate your confidence in each topic — we'll personalise your sessions
          </div>
        </div>

        {/* Topic cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {TOPICS.map(topic => {
            const level    = conf[topic.id]
            const selected = LEVELS.find(l => l.value === level)!

            return (
              <div key={topic.id} className="glass" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${topic.color}18`, border: `1px solid ${topic.color}40`,
                    fontSize: 18,
                  }}>
                    {topic.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e8f4ff' }}>{topic.name}</div>
                    <div style={{ fontSize: 11, color: selected.color, fontWeight: 600, marginTop: 1 }}>
                      {selected.label}
                    </div>
                  </div>
                </div>

                {/* Confidence buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {LEVELS.map(l => {
                    const active = level === l.value
                    return (
                      <button
                        key={l.value}
                        onClick={() => setConf(c => ({ ...c, [topic.id]: l.value }))}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 8,
                          border: `1px solid ${active ? l.color : 'rgba(255,255,255,0.08)'}`,
                          background: active ? `${l.color}20` : 'rgba(255,255,255,0.03)',
                          color: active ? l.color : 'rgba(140,200,255,0.3)',
                          fontSize: 15,
                          fontWeight: 900,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {l.value}
                      </button>
                    )
                  })}
                </div>

                {/* Scale labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, padding: '0 2px' }}>
                  <span style={{ fontSize: 9, color: 'rgba(140,200,255,0.3)', fontWeight: 600 }}>BEGINNER</span>
                  <span style={{ fontSize: 9, color: 'rgba(140,200,255,0.3)', fontWeight: 600 }}>EXPERT</span>
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)',
            fontSize: 12, color: '#ff3d6b', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={submit}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', fontSize: 15, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Saving...' : 'Start Learning →'}
        </button>
      </div>
    </div>
  )
}
