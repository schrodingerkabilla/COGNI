import { useState, useEffect } from 'react'
import * as api from '../api'

interface Analytics {
  status: string
  attempts: number
  tensor_shape: [number, number]
  mastery: {
    topics: Record<string, number>
    patterns: Record<string, number>
  }
  behavioral_profile: {
    type: string
    scores: {
      speed_norm: number
      first_inter_norm: number
      avg_switches: number
      avg_reviews: number
      avg_tab_count: number
      avg_hover_dur_s: number
      accuracy: number
      improvement_trend: number
    }
  }
  weak_patterns: { pattern_id: string; mastery: number }[]
  recommendations: string[]
  encodings: Record<string, Record<string, string>>
  computed_at: string | null
}

const TRAIT_COLORS: Record<string, string> = {
  'Rusher':     '#ff3d6b',
  'Hesitator':  '#f59e0b',
  'Switcher':   '#c4b5fd',
  'Reviewer':   '#06d6a0',
  'Distracted': '#ff6b35',
  'Steady':     '#06d6a0',
  'no_data':    '#444',
}

function masteryColor(m: number) {
  return m >= 0.75 ? '#06d6a0' : m >= 0.50 ? '#f59e0b' : '#ff3d6b'
}

function MasteryBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 8px ${color}60`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

function ScoreGauge({ label, value, hi = 1, invert = false }: { label: string; value: number; hi?: number; invert?: boolean }) {
  const norm = Math.min(1, value / hi)
  const display = invert ? 1 - norm : norm
  const color = display >= 0.66 ? '#06d6a0' : display >= 0.33 ? '#f59e0b' : '#ff3d6b'
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', margin: '0 auto 6px',
        background: `conic-gradient(${color} ${display * 360}deg, rgba(255,255,255,0.06) 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 14px ${color}40`,
      }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#030b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 900, color }}>{Math.round(display * 100)}</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(140,200,255,0.45)', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

export default function InsightsScreen() {
  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error,   setError]   = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const d = await api.getMyAnalytics()
      setData(d)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('404') || msg.includes('No analytics')) {
        await rerun()
      } else {
        setError('Could not load — is the backend running?')
      }
    } finally {
      setLoading(false)
    }
  }

  async function rerun() {
    setRunning(true)
    setError('')
    try {
      await api.runAnalytics()
      const d = await api.getMyAnalytics()
      setData(d)
    } catch {
      setError('Engine failed to run — complete a practice session first.')
    } finally {
      setRunning(false)
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const profile = data?.behavioral_profile
  const scores  = profile?.scores
  const traits  = profile?.type?.split(' + ') ?? []

  return (
    <div className="content-scroll">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e8f4ff' }}>⚡ AI Insights</div>
          <div style={{ fontSize: 12, color: 'rgba(0,190,255,0.5)', marginTop: 2 }}>
            {data ? `Based on ${data.attempts} attempts · tensor ${data.tensor_shape[0]}×${data.tensor_shape[1]}` : 'Knowledge tracing engine'}
          </div>
        </div>
        <button
          onClick={rerun}
          disabled={running}
          style={{
            padding: '8px 16px', borderRadius: 10,
            border: '1px solid rgba(0,150,255,0.3)',
            background: 'rgba(0,100,255,0.1)', color: '#60d4ff',
            fontSize: 13, fontWeight: 700, cursor: running ? 'default' : 'pointer',
            fontFamily: 'inherit', opacity: running ? 0.6 : 1,
          }}
        >
          {running ? 'Running…' : '↻ Re-run'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)', color: '#ff3d6b', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {(loading || running) && !data && (
        <div style={{ color: 'rgba(140,200,255,0.45)', fontSize: 14, textAlign: 'center', padding: 60 }}>
          {running ? 'Running knowledge tracing engine…' : 'Loading insights…'}
        </div>
      )}

      {data && data.status === 'no_data' && (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e8f4ff', marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 13, color: 'rgba(140,200,255,0.5)' }}>Complete a practice session to unlock AI insights.</div>
        </div>
      )}

      {data && data.status === 'ok' && (
        <>
          {/* ── Behavioral Profile ── */}
          <div className="glass" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)', marginBottom: 14 }}>
              Behavioral Profile
            </div>

            {/* Trait badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {traits.map(t => {
                const c = TRAIT_COLORS[t] ?? '#60d4ff'
                return (
                  <span key={t} style={{
                    padding: '5px 14px', borderRadius: 20,
                    background: `${c}18`, border: `1px solid ${c}40`,
                    fontSize: 13, fontWeight: 800, color: c,
                  }}>{t}</span>
                )
              })}
            </div>

            {/* Gauge row */}
            {scores && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-around' }}>
                <ScoreGauge label="Accuracy"  value={scores.accuracy}         hi={1}   />
                <ScoreGauge label="Speed"     value={scores.speed_norm}       hi={1}   invert />
                <ScoreGauge label="Focus"     value={scores.avg_tab_count}    hi={1}   invert />
                <ScoreGauge label="Decision"  value={scores.avg_switches}     hi={3}   invert />
                <ScoreGauge label="Trend"     value={0.5 + scores.improvement_trend} hi={1} />
              </div>
            )}
          </div>

          {/* ── Topic Mastery ── */}
          <div className="glass" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)', marginBottom: 16 }}>
              Topic Mastery
            </div>
            {Object.entries(data.mastery.topics)
              .sort(([, a], [, b]) => b - a)
              .map(([topic, m]) => (
                <MasteryBar key={topic} label={topic.replace(/-/g, ' ')} value={m} color={masteryColor(m)} />
              ))
            }
            {Object.keys(data.mastery.topics).length === 0 && (
              <div style={{ fontSize: 13, color: 'rgba(140,200,255,0.4)' }}>No topic data yet.</div>
            )}
          </div>

          {/* ── Pattern Mastery ── */}
          {Object.keys(data.mastery.patterns).length > 0 && (
            <div className="glass" style={{ padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)', marginBottom: 16 }}>
                Pattern Mastery
              </div>
              {Object.entries(data.mastery.patterns)
                .sort(([, a], [, b]) => a - b)
                .map(([pat, m]) => (
                  <MasteryBar key={pat} label={pat} value={m} color={masteryColor(m)} />
                ))
              }
            </div>
          )}

          {/* ── Weak Patterns ── */}
          {data.weak_patterns.length > 0 && (
            <div className="glass" style={{ padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)', marginBottom: 14 }}>
                Needs Work
              </div>
              {data.weak_patterns.map(w => (
                <div key={w.pattern_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,61,107,0.07)', border: '1px solid rgba(255,61,107,0.18)',
                }}>
                  <span style={{ fontSize: 15 }}>⚠</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4ff' }}>{w.pattern_id}</div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: 'rgba(255,61,107,0.15)', border: '1px solid rgba(255,61,107,0.3)',
                    fontSize: 12, fontWeight: 800, color: '#ff3d6b',
                  }}>{Math.round(w.mastery * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Recommendations ── */}
          <div className="glass" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)', marginBottom: 14 }}>
              Recommendations
            </div>
            {data.recommendations.map((r, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(0,100,255,0.07)', border: '1px solid rgba(0,150,255,0.15)',
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>→</span>
                <span style={{ fontSize: 13, color: 'rgba(180,220,255,0.8)', lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>

          {/* ── Tensor info ── */}
          <div className="glass" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f4ff' }}>Feature Tensor</div>
              <div style={{ fontSize: 11, color: 'rgba(0,190,255,0.45)', marginTop: 3 }}>
                shape ({data.tensor_shape[0]} × {data.tensor_shape[1]}) · {data.tensor_shape[0] * data.tensor_shape[1]} values stored
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.35)', textAlign: 'right' }}>
              {data.computed_at ? new Date(data.computed_at).toLocaleTimeString() : '—'}
            </div>
          </div>

          <div style={{ height: 48 }} />
        </>
      )}
    </div>
  )
}
