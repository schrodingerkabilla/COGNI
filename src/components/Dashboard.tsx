import { useEffect, useState } from 'react'
import * as api from '../api'

const PATTERN_NAMES: Record<string, string> = {
  ns1: 'Place Value',           ns2: 'Rounding',
  ad1: 'Round & Compensate',   ad2: 'Multi-addend Addition',
  sb1: 'Bridge Through 100',   sb2: 'Round & Compensate (Sub)',
  ml1: 'Expand & Multiply',    ml2: 'Times Tables',       ml3: 'Multiply by 10s',
  dv1: 'Think Multiplication', dv2: 'Partial Quotients',
  fr1: 'Same Denom Addition',  fr2: 'Fraction to Percent',
  dc1: 'Pair the Halves',      dc2: 'Decimal Multiply',
  pc1: 'Percentage Shortcuts', pc2: 'Reverse Percentage',
  sm1: 'BODMAS',               sm2: 'Squaring Shortcut',
}

const TOPIC_META: Record<string, { icon: string; color: string; label: string }> = {
  'addition':       { icon: '+',  color: '#00d4ff', label: 'Addition'       },
  'subtraction':    { icon: '−',  color: '#f59e0b', label: 'Subtraction'    },
  'multiplication': { icon: '×',  color: '#06d6a0', label: 'Multiplication' },
  'division':       { icon: '÷',  color: '#a78bfa', label: 'Division'       },
  'fractions':      { icon: '½',  color: '#ff6b6b', label: 'Fractions'      },
  'decimals':       { icon: '.5', color: '#ffd93d', label: 'Decimals'       },
  'percentages':    { icon: '%',  color: '#6bcb77', label: 'Percentages'    },
  'number-sense':   { icon: '#',  color: '#4d96ff', label: 'Number Sense'   },
  'speed-math':     { icon: '⚡', color: '#ff9f43', label: 'Speed Math'     },
  'mixed':          { icon: '∞',  color: '#c4b5fd', label: 'Mixed'          },
}

interface TopicStat {
  topic_id: string
  attempts: number
  correct:  number
  accuracy: number
}

interface PatternStat {
  pattern_id: string
  topic_id:   string
  attempts:   number
  correct:    number
  accuracy:   number
}

interface Prediction {
  status: string
  message?: string
  next_likely_failure?: {
    pattern_id:          string
    risk_score:          number
    recent_accuracy:     number
    attempts_on_pattern: number
  }
  error_type?: string
  reason?: string
  behavioral_signature?: {
    hesitation_gap:      number | null
    confidence_gap:      number | null
    overall_accuracy:    number
    hesitation_on_wrong: number | null
    hesitation_on_right: number | null
  }
  pattern_risks?: { pattern_id: string; risk: number; recent_acc: number; trend: number }[]
  total_attempts?: number
}

interface UserStats {
  username:         string
  total_xp:         number
  streak:           number
  total_sessions:   number
  overall_accuracy: number
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="glass stat-card" style={{ borderColor: `${color}28` }}>
      <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="stat-value" style={{ color, textShadow: `0 0 24px ${color}60` }}>{value}</div>
    </div>
  )
}

function AccuracyBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function Dashboard() {
  const [user,       setUser]       = useState<UserStats | null>(null)
  const [topics,     setTopics]     = useState<TopicStat[]>([])
  const [patterns,   setPatterns]   = useState<PatternStat[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([api.getMe(), api.getTopicStats(), api.getPatternStats(), api.getPredict()])
      .then(([u, t, p, pr]) => { setUser(u); setTopics(t); setPatterns(p); setPrediction(pr) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="content-scroll">

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 26, fontWeight: 900, marginBottom: 6,
          background: 'linear-gradient(135deg, #ffffff 0%, #60d4ff 50%, #0088ff 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block',
        }}>
          {user ? `Hey ${user.username} ⚡` : 'Loading...'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,190,255,0.55)', fontWeight: 500 }}>
          Your cognitive fingerprint — updated after every question
        </div>
      </div>

      {/* Stats */}
      {user && (
        <div className="stat-row">
          <StatCard label="Total XP"   value={user.total_xp.toLocaleString()} color="#00d4ff" />
          <StatCard label="Streak"     value={`${user.streak}d`}              color="#f59e0b" />
          <StatCard label="Sessions"   value={user.total_sessions}            color="#06d6a0" />
          <StatCard label="Accuracy"   value={`${user.overall_accuracy}%`}    color="#a78bfa" />
        </div>
      )}

      {/* Prediction card */}
      {prediction && prediction.status === 'ok' && prediction.next_likely_failure && (
        <div style={{
          marginTop: 16, padding: '20px 22px', borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(255,61,107,0.1) 0%, rgba(120,0,255,0.08) 100%)',
          border: '1px solid rgba(255,61,107,0.3)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', letterSpacing: 1, marginBottom: 12 }}>
            COGNITIVE PREDICTION
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              fontSize: 28, fontWeight: 900, color: '#ff6b6b',
              textShadow: '0 0 24px rgba(255,61,107,0.6)',
            }}>
              {PATTERN_NAMES[prediction.next_likely_failure.pattern_id] ?? prediction.next_likely_failure.pattern_id}
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(255,61,107,0.15)', border: '1px solid rgba(255,61,107,0.3)',
              fontSize: 11, fontWeight: 700, color: '#ff6b6b',
            }}>
              {prediction.next_likely_failure.recent_accuracy}% recent accuracy
            </div>
          </div>

          <div style={{
            fontSize: 13, color: 'rgba(220,200,255,0.8)', lineHeight: 1.6, marginBottom: 14,
          }}>
            {prediction.reason}
          </div>

          {prediction.behavioral_signature && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Error type',   value: prediction.error_type ?? '—' },
                { label: 'Hesitation gap', value: prediction.behavioral_signature.hesitation_gap != null ? `${Math.round(prediction.behavioral_signature.hesitation_gap * 100)}%` : '—' },
                { label: 'Confidence gap', value: prediction.behavioral_signature.confidence_gap != null ? `${Math.round(prediction.behavioral_signature.confidence_gap * 100)}%` : '—' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ fontSize: 9, color: 'rgba(140,200,255,0.4)', fontWeight: 700, marginBottom: 2 }}>{item.label.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4ff' }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {prediction && (prediction.status === 'no_data' || prediction.status === 'building') && (
        <div style={{
          marginTop: 16, padding: '16px 20px', borderRadius: 14,
          background: 'rgba(0,100,255,0.06)', border: '1px solid rgba(0,140,255,0.15)',
          fontSize: 13, color: 'rgba(140,200,255,0.6)',
        }}>
          🧠 {prediction.message}
        </div>
      )}

      {/* Dynamic topics */}
      <div className="glass" style={{ padding: '20px 22px', marginTop: 16 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Topics Encountered</div>

        {loading && (
          <div style={{ color: 'rgba(140,200,255,0.4)', fontSize: 13 }}>Loading...</div>
        )}

        {!loading && topics.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f4ff', marginBottom: 6 }}>
              No topics yet
            </div>
            <div style={{ fontSize: 12, color: 'rgba(140,200,255,0.45)' }}>
              Start a Quick Quiz — topics appear here as you encounter them
            </div>
          </div>
        )}

        {topics.map(t => {
          const meta = TOPIC_META[t.topic_id] ?? { icon: '?', color: '#60d4ff', label: t.topic_id }
          return (
            <div key={t.topic_id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${meta.color}18`, border: `1px solid ${meta.color}40`,
                fontSize: 16, fontWeight: 800, color: meta.color,
              }}>{meta.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e8f4ff' }}>{meta.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: meta.color }}>{t.accuracy}%</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)', marginTop: 2 }}>
                  {t.attempts} question{t.attempts !== 1 ? 's' : ''} · {t.correct} correct
                </div>
                <AccuracyBar value={t.accuracy} color={meta.color} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Micro patterns */}
      {patterns.length > 0 && (
        <div className="glass" style={{ padding: '20px 22px', marginTop: 12 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>Patterns Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {patterns.map(p => {
              const topicMeta = TOPIC_META[p.topic_id] ?? { color: '#60d4ff', label: p.topic_id, icon: '?' }
              const name = PATTERN_NAMES[p.pattern_id] ?? p.pattern_id
              const isWeak = p.accuracy < 50
              return (
                <div key={p.pattern_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: isWeak ? 'rgba(255,61,107,0.06)' : 'rgba(0,100,255,0.05)',
                  border: `1px solid ${isWeak ? 'rgba(255,61,107,0.2)' : 'rgba(0,140,255,0.1)'}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f4ff' }}>{name}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: isWeak ? '#ff6b6b' : '#06d6a0' }}>
                        {p.accuracy}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: topicMeta.color, fontWeight: 600 }}>
                        {topicMeta.label}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(140,200,255,0.4)' }}>
                        {p.attempts} attempts
                      </span>
                    </div>
                    <AccuracyBar value={p.accuracy} color={isWeak ? '#ff6b6b' : '#06d6a0'} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
