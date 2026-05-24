import { useState, useEffect } from 'react'
import * as api from '../api'

interface Stats {
  counts: Record<string, number>
  recent_events: {
    id: number; type: string; user_id: number | null
    session_id: number | null; attempt_id: number | null
    payload: Record<string, unknown>; received_at: string | null
  }[]
  sessions: {
    id: number; user_id: number; topic_id: string; started_at: string | null
    total_questions: number; correct_count: number; accuracy: number
    xp_gained: number; attempts_count: number; hovers_count: number
    switches_count: number; reviews_count: number
  }[]
  users: {
    id: number; username: string; total_xp: number
    total_sessions: number; overall_accuracy: number; level: number
  }[]
}

interface TensorData {
  feature_matrix: number[][]
  feature_names: string[]
  shape: [number, number]
  computed_at: string | null
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  is_correct:                    'Was the answer correct? (0/1)',
  time_to_answer_ms:             'Total ms from question shown to confirm',
  time_to_first_interaction_ms:  'Ms before first click/hover',
  time_from_last_switch_ms:      'Ms between last option switch and confirm',
  hover_count:                   'Number of option hover events',
  hover_avg_duration_ms:         'Average hover duration in ms',
  switch_count:                  'Number of answer switches',
  review_count:                  'Times Re-read button was pressed',
  tab_away_count:                'Times user tabbed away from window',
  tab_away_total_ms:             'Total ms spent tabbed away',
  strategy_enc:                  'Integer-encoded strategy label',
  pattern_enc:                   'Integer-encoded pattern_id',
  topic_enc:                     'Integer-encoded topic_id',
  attempt_number:                'Position within the session (0-indexed)',
  accuracy_so_far:               'Rolling accuracy up to this attempt',
}

const EVENT_COLORS: Record<string, string> = {
  hover: '#60d4ff', switch: '#f59e0b', strength: '#c4b5fd',
  review: '#06d6a0', tab_visibility: '#0088ff', focus_hint: '#ff9f43',
  attempt: '#e8f4ff', session_start: '#aaaaaa', session_end: '#888888',
}

const COUNT_TILES = [
  { key: 'users',                 label: 'Users',          icon: '👤', color: '#60d4ff' },
  { key: 'sessions',              label: 'Sessions',       icon: '▶',  color: '#0088ff' },
  { key: 'attempts',              label: 'Attempts',       icon: '✎',  color: '#e8f4ff' },
  { key: 'hover_events',          label: 'Hovers',         icon: '↗',  color: '#60d4ff' },
  { key: 'option_switches',       label: 'Switches',       icon: '↔',  color: '#f59e0b' },
  { key: 'strength_changes',      label: 'Strength Drags', icon: '⇔',  color: '#c4b5fd' },
  { key: 'review_events',         label: 'Re-reads',       icon: '📖', color: '#06d6a0' },
  { key: 'focus_hint_events',     label: 'Focus Hints',    icon: '🎯', color: '#ff9f43' },
  { key: 'tab_visibility_events', label: 'Tab Away',       icon: '⇥',  color: '#0088ff' },
  { key: 'raw_events',            label: 'Raw Events',     icon: '◉',  color: '#aaaaaa' },
]

function ts(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function colColor(name: string, val: number): string {
  if (name === 'is_correct')      return val === 1 ? '#06d6a0' : '#ff3d6b'
  if (name === 'accuracy_so_far') return val >= 0.75 ? '#06d6a0' : val >= 0.5 ? '#f59e0b' : '#ff3d6b'
  return '#e8f4ff'
}

function fmt(name: string, val: number): string {
  if (name === 'is_correct')      return val === 1 ? '✓' : '✗'
  if (name === 'accuracy_so_far') return (val * 100).toFixed(0) + '%'
  if (name.endsWith('_ms'))       return val > 999 ? (val / 1000).toFixed(1) + 's' : val.toFixed(0) + 'ms'
  if (Number.isInteger(val))      return String(val)
  return val.toFixed(2)
}

export default function DataView() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [tensor,  setTensor]  = useState<TensorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tensorLoading, setTensorLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState<'events' | 'sessions' | 'users' | 'tensor'>('events')
  const [expanded, setExpanded] = useState<number | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await api.getAdminStats()
      setStats(data)
    } catch {
      setError('Could not load — is the backend running?')
    } finally { setLoading(false) }
  }

  async function loadTensor() {
    setTensorLoading(true)
    try {
      const data = await api.getMyTensor()
      setTensor(data)
    } catch {
      // no tensor yet — try running analytics first
      try {
        await api.runAnalytics()
        const data = await api.getMyTensor()
        setTensor(data)
      } catch {
        setTensor(null)
      }
    } finally { setTensorLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (tab === 'tensor' && !tensor) loadTensor()
  }, [tab])

  return (
    <div className="content-scroll">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e8f4ff' }}>◉ Data Lake</div>
          <div style={{ fontSize: 12, color: 'rgba(0,190,255,0.5)', marginTop: 2 }}>
            Every event, attempt, and behavioral signal captured per user
          </div>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,150,255,0.3)', background: 'rgba(0,100,255,0.1)', color: '#60d4ff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)', color: '#ff3d6b', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && !stats && (
        <div style={{ color: 'rgba(140,200,255,0.5)', fontSize: 14, textAlign: 'center', padding: 40 }}>Loading…</div>
      )}

      {stats && (
        <>
          {/* Count tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
            {COUNT_TILES.map(tile => (
              <div key={tile.key} className="glass" style={{ padding: '14px 16px', textAlign: 'center', border: `1px solid ${tile.color}20` }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{tile.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: tile.color, lineHeight: 1 }}>
                  {(stats.counts[tile.key] ?? 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(140,200,255,0.45)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>
                  {tile.label}
                </div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(0,100,255,0.07)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {(['events', 'sessions', 'tensor', 'users'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: tab === t ? 'rgba(0,150,255,0.22)' : 'transparent',
                  color: tab === t ? '#60d4ff' : 'rgba(140,200,255,0.4)',
                }}
              >
                {t === 'events'  ? `Events (${stats.recent_events.length})`
                 : t === 'sessions' ? `Sessions (${stats.sessions.length})`
                 : t === 'tensor'   ? `Feature Matrix`
                 : `Users (${stats.users.length})`}
              </button>
            ))}
          </div>

          {/* ── EVENTS TAB ── */}
          {tab === 'events' && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)' }}>
                Last 30 Raw Events — click any row to expand payload
              </div>
              {stats.recent_events.map(ev => {
                const color = EVENT_COLORS[ev.type] ?? '#888'
                const isOpen = expanded === ev.id
                return (
                  <div key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div
                      onClick={() => setExpanded(isOpen ? null : ev.id)}
                      style={{
                        display: 'grid', gridTemplateColumns: '60px 130px 60px 60px 80px 1fr 24px',
                        gap: 12, padding: '10px 20px', cursor: 'pointer', alignItems: 'center',
                        background: isOpen ? 'rgba(0,100,255,0.07)' : 'transparent',
                      }}
                    >
                      <div style={{ fontSize: 10, color: 'rgba(140,200,255,0.4)', fontWeight: 600 }}>#{ev.id}</div>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: `${color}18`, border: `1px solid ${color}35`, fontSize: 11, fontWeight: 700, color, width: 'fit-content' }}>{ev.type}</span>
                      <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)' }}>{ev.user_id ? `u${ev.user_id}` : '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)' }}>{ev.session_id ? `s${ev.session_id}` : '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)' }}>{ev.attempt_id ? `a${ev.attempt_id}` : '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.5)' }}>{ts(ev.received_at)}</div>
                      <div style={{ fontSize: 12, color: 'rgba(140,200,255,0.35)', textAlign: 'right' }}>{isOpen ? '▲' : '▼'}</div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0 20px 14px 20px' }}>
                        <pre style={{
                          margin: 0, padding: '12px 14px', borderRadius: 8,
                          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
                          fontSize: 11, color: '#a0d4ff', overflow: 'auto',
                          fontFamily: '"Courier New", monospace', lineHeight: 1.6, maxHeight: 220,
                        }}>
                          {JSON.stringify(ev.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {tab === 'sessions' && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)' }}>
                Last 20 Sessions
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,100,255,0.06)' }}>
                      {['ID','User','Topic','Started','Q','Correct','Acc%','XP','Hovers','Switches','Re-reads'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'rgba(0,190,255,0.5)', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.sessions.map((s, i) => {
                      const accColor = s.accuracy >= 75 ? '#06d6a0' : s.accuracy >= 50 ? '#f59e0b' : '#ff3d6b'
                      return (
                        <tr key={s.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,100,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '9px 14px', color: 'rgba(140,200,255,0.45)' }}>#{s.id}</td>
                          <td style={{ padding: '9px 14px', color: '#e8f4ff', fontWeight: 600 }}>u{s.user_id}</td>
                          <td style={{ padding: '9px 14px', color: '#60d4ff' }}>{s.topic_id}</td>
                          <td style={{ padding: '9px 14px', color: 'rgba(140,200,255,0.5)', whiteSpace: 'nowrap' }}>{ts(s.started_at)}</td>
                          <td style={{ padding: '9px 14px', color: '#e8f4ff', textAlign: 'center' }}>{s.attempts_count}</td>
                          <td style={{ padding: '9px 14px', color: '#06d6a0', textAlign: 'center' }}>{s.correct_count}</td>
                          <td style={{ padding: '9px 14px', color: accColor, fontWeight: 800, textAlign: 'center' }}>{s.accuracy ? s.accuracy.toFixed(0) : '—'}</td>
                          <td style={{ padding: '9px 14px', color: '#f59e0b', textAlign: 'center' }}>+{s.xp_gained}</td>
                          <td style={{ padding: '9px 14px', color: '#60d4ff', textAlign: 'center' }}>{s.hovers_count}</td>
                          <td style={{ padding: '9px 14px', color: '#f59e0b', textAlign: 'center' }}>{s.switches_count}</td>
                          <td style={{ padding: '9px 14px', color: '#06d6a0', textAlign: 'center' }}>{s.reviews_count}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TENSOR TAB ── */}
          {tab === 'tensor' && (
            <>
              {/* Feature legend */}
              <div className="glass" style={{ padding: '18px 22px', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)', marginBottom: 14 }}>
                  15 Captured Features — one row per attempt
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
                  {Object.entries(FEATURE_DESCRIPTIONS).map(([name, desc], i) => (
                    <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#0088ff', minWidth: 18, marginTop: 1 }}>{i}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#e8f4ff', fontFamily: '"Courier New", monospace' }}>{name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(140,200,255,0.45)', lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matrix */}
              {tensorLoading && (
                <div style={{ color: 'rgba(140,200,255,0.45)', fontSize: 14, textAlign: 'center', padding: 40 }}>
                  Loading feature matrix…
                </div>
              )}

              {!tensorLoading && !tensor && (
                <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f4ff', marginBottom: 8 }}>No tensor yet</div>
                  <div style={{ fontSize: 13, color: 'rgba(140,200,255,0.5)' }}>Complete a practice session — the matrix builds automatically.</div>
                </div>
              )}

              {tensor && tensor.feature_matrix.length > 0 && (
                <div className="glass" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)' }}>
                      Feature Matrix
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(0,150,255,0.12)', border: '1px solid rgba(0,150,255,0.25)', fontSize: 11, fontWeight: 800, color: '#60d4ff' }}>
                      {tensor.shape[0]} × {tensor.shape[1]}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(140,200,255,0.35)', marginLeft: 'auto' }}>
                      {tensor.computed_at ? new Date(tensor.computed_at).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,100,255,0.08)' }}>
                          <th style={{ padding: '8px 12px', color: 'rgba(0,190,255,0.45)', fontSize: 10, fontWeight: 700, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>#</th>
                          {tensor.feature_names.map((n, i) => (
                            <th key={i} style={{ padding: '8px 10px', color: '#0088ff', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                              {n.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tensor.feature_matrix.map((row, ri) => (
                          <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(0,100,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '7px 12px', color: 'rgba(140,200,255,0.35)', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.06)' }}>{ri}</td>
                            {row.map((val, ci) => (
                              <td key={ci} style={{ padding: '7px 10px', textAlign: 'center', fontFamily: '"Courier New", monospace', fontWeight: ci === 0 ? 800 : 400, color: colColor(tensor.feature_names[ci], val), borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                                {fmt(tensor.feature_names[ci], val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)' }}>
                All Users
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,100,255,0.06)' }}>
                      {['ID','Username','XP','Sessions','Accuracy%','Level'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: 'rgba(0,190,255,0.5)', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.map((u, i) => (
                      <tr key={u.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,100,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', color: 'rgba(140,200,255,0.45)' }}>#{u.id}</td>
                        <td style={{ padding: '10px 14px', color: '#e8f4ff', fontWeight: 700 }}>{u.username}</td>
                        <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 800 }}>{u.total_xp.toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', color: '#60d4ff', textAlign: 'center' }}>{u.total_sessions}</td>
                        <td style={{ padding: '10px 14px', color: u.overall_accuracy >= 75 ? '#06d6a0' : u.overall_accuracy >= 50 ? '#f59e0b' : '#ff3d6b', fontWeight: 800, textAlign: 'center' }}>
                          {u.overall_accuracy ? u.overall_accuracy.toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(0,150,255,0.15)', border: '1px solid rgba(0,150,255,0.3)', color: '#60d4ff', fontSize: 11, fontWeight: 700 }}>
                            Lv {u.level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ height: 48 }} />
        </>
      )}
    </div>
  )
}
