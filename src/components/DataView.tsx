import { useState, useEffect } from 'react'
import * as api from '../api'

// ── Types ────────────────────────────────────────────────────

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

interface DatalakeUserSummary {
  id: number; username: string; total_xp: number
  total_sessions: number; overall_accuracy: number; attempt_count: number
}

interface HoverEv {
  id: number; option_value: number; hover_start_ms: number
  hover_end_ms: number; hover_duration_ms: number
  sequence_index: number; was_final_selection: boolean
}
interface SwitchEv {
  id: number; from_option: number; to_option: number
  timestamp_ms: number; switch_number: number
  time_since_last_switch_ms: number; time_since_question_shown_ms: number
}
interface ReviewEv {
  id: number; review_number: number; review_start_ms: number
  review_end_ms: number; review_duration_ms: number
  option_hovered_during_review: boolean; changed_answer_after_review: boolean
  answer_before_review: number | null; answer_after_review: number | null
}
interface StrengthEv {
  id: number; step_index: number; old_value: number; new_value: number
  timestamp_ms: number; drag_count: number; time_to_first_drag_ms: number
  time_between_drags_ms: number; total_time_on_step_ms: number
}
interface AttemptRow {
  attempt_id: number; question_prompt: string
  correct_answer: number; selected_answer: number | null; is_correct: boolean
  pattern_id: string; strategy: string
  time_to_answer_ms: number; time_to_first_interaction_ms: number
  time_before_first_hover_ms: number; time_from_last_switch_to_submit_ms: number
  hover_count: number; switch_count: number; review_count: number
  strength_change_count: number; total_hover_duration_ms: number
  hovers: HoverEv[]; switches: SwitchEv[]
  reviews: ReviewEv[]; strength_changes: StrengthEv[]
}
interface DatalakeSession {
  session_id: number; topic_id: string; started_at: string | null
  ended_at: string | null; total_questions: number; correct_count: number
  accuracy: number; xp_gained: number; attempts: AttemptRow[]
}
interface DatalakeUser {
  user: { id: number; username: string; email: string; total_xp: number; level: number; total_sessions: number; overall_accuracy: number; created_at: string | null }
  sessions: DatalakeSession[]
  tab_visibility_events: { id: number; session_id: number | null; attempt_id: number | null; hidden_at_ms: number; visible_at_ms: number; duration_ms: number; was_mid_question: boolean; had_selection: boolean }[]
}

// ── Helpers ──────────────────────────────────────────────────

function ms(v: number) { return v > 999 ? (v / 1000).toFixed(2) + 's' : v + 'ms' }
function ts(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function accColor(v: number) { return v >= 75 ? '#06d6a0' : v >= 50 ? '#f59e0b' : '#ff3d6b' }

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

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 700,
  color: 'rgba(0,190,255,0.5)', fontSize: 10, letterSpacing: 0.8,
  textTransform: 'uppercase', whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  borderRight: '1px solid rgba(255,255,255,0.04)',
  background: 'rgba(0,100,255,0.06)',
}
const TD: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  borderRight: '1px solid rgba(255,255,255,0.03)',
}

// ── Sub-components ───────────────────────────────────────────

function AttemptDetail({ a }: { a: AttemptRow }) {
  return (
    <div style={{ padding: '12px 20px 16px 36px', background: 'rgba(0,0,0,0.25)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
      {a.hovers.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#60d4ff', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Hovers ({a.hovers.length})</div>
          {a.hovers.map(h => (
            <div key={h.id} style={{ fontSize: 11, color: 'rgba(140,200,255,0.7)', marginBottom: 3, fontFamily: 'monospace' }}>
              opt {h.option_value} · {ms(h.hover_duration_ms)} · seq#{h.sequence_index}{h.was_final_selection ? ' ✓' : ''}
            </div>
          ))}
        </div>
      )}
      {a.switches.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Switches ({a.switches.length})</div>
          {a.switches.map(sw => (
            <div key={sw.id} style={{ fontSize: 11, color: 'rgba(140,200,255,0.7)', marginBottom: 3, fontFamily: 'monospace' }}>
              {sw.from_option}→{sw.to_option} · @{ms(sw.timestamp_ms)}
            </div>
          ))}
        </div>
      )}
      {a.reviews.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#06d6a0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Re-reads ({a.reviews.length})</div>
          {a.reviews.map(r => (
            <div key={r.id} style={{ fontSize: 11, color: 'rgba(140,200,255,0.7)', marginBottom: 3, fontFamily: 'monospace' }}>
              {ms(r.review_duration_ms)}{r.changed_answer_after_review ? ' · changed' : ''}
            </div>
          ))}
        </div>
      )}
      {a.strength_changes.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Strength drags ({a.strength_changes.length})</div>
          {a.strength_changes.map(sc => (
            <div key={sc.id} style={{ fontSize: 11, color: 'rgba(140,200,255,0.7)', marginBottom: 3, fontFamily: 'monospace' }}>
              step{sc.step_index}: {sc.old_value}→{sc.new_value} · {sc.drag_count}x
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DataLakeView({ users }: { users: DatalakeUserSummary[] }) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(users[0]?.id ?? null)
  const [userData, setUserData] = useState<DatalakeUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedAttempt, setExpandedAttempt] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedUserId) return
    setLoading(true)
    setUserData(null)
    setExpandedAttempt(null)
    api.getDatalakeUser(selectedUserId)
      .then(setUserData)
      .catch(console.warn)
      .finally(() => setLoading(false))
  }, [selectedUserId])

  const allAttempts: (AttemptRow & { session_id: number; topic_id: string })[] =
    (userData?.sessions ?? []).flatMap(s =>
      s.attempts.map(a => ({ ...a, session_id: s.session_id, topic_id: s.topic_id }))
    )

  return (
    <div>
      {/* User pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => setSelectedUserId(u.id)}
            style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
              borderColor: selectedUserId === u.id ? '#60d4ff' : 'rgba(0,150,255,0.2)',
              background: selectedUserId === u.id ? 'rgba(0,150,255,0.18)' : 'rgba(0,100,255,0.06)',
              color: selectedUserId === u.id ? '#60d4ff' : 'rgba(140,200,255,0.55)',
            }}
          >
            {u.username}
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.65 }}>{u.attempt_count} attempts</span>
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: 'rgba(140,200,255,0.4)', textAlign: 'center', padding: 40 }}>Loading user data…</div>
      )}

      {userData && (
        <>
          {/* User stat bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            {[
              { label: 'User ID',   val: `#${userData.user.id}`,                          color: 'rgba(140,200,255,0.5)' },
              { label: 'Sessions',  val: userData.user.total_sessions,                     color: '#60d4ff' },
              { label: 'Attempts',  val: allAttempts.length,                               color: '#e8f4ff' },
              { label: 'Accuracy',  val: userData.user.overall_accuracy ? userData.user.overall_accuracy.toFixed(1) + '%' : '—', color: accColor(userData.user.overall_accuracy) },
              { label: 'XP',        val: userData.user.total_xp.toLocaleString(),          color: '#f59e0b' },
              { label: 'Level',     val: `Lv ${userData.user.level}`,                      color: '#c4b5fd' },
              { label: 'Tab-aways', val: userData.tab_visibility_events.length,            color: '#0088ff' },
            ].map(item => (
              <div key={item.label} className="glass" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.val}</div>
                <div style={{ fontSize: 10, color: 'rgba(140,200,255,0.4)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Flat attempt table */}
          {allAttempts.length === 0 ? (
            <div className="glass" style={{ padding: 32, textAlign: 'center', color: 'rgba(140,200,255,0.4)' }}>
              No attempts yet for this user.
            </div>
          ) : (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)' }}>
                {allAttempts.length} Attempts — click row to expand events
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                  <thead>
                    <tr>
                      {['#','Sess','Topic','Pattern','Question','✓/✗','Answer','Strategy',
                        'Total ms','First interact','First hover','Last switch→submit',
                        'Hovers','Hover ms','Switches','Re-reads','Strength drags', ''].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allAttempts.map((a, i) => {
                      const isOpen = expandedAttempt === a.attempt_id
                      const hasEvents = a.hover_count + a.switch_count + a.review_count + a.strength_change_count > 0
                      return (
                        <>
                          <tr
                            key={a.attempt_id}
                            onClick={() => hasEvents && setExpandedAttempt(isOpen ? null : a.attempt_id)}
                            style={{
                              background: isOpen ? 'rgba(0,100,255,0.09)' : i % 2 === 0 ? 'transparent' : 'rgba(0,100,255,0.025)',
                              cursor: hasEvents ? 'pointer' : 'default',
                            }}
                          >
                            <td style={{ ...TD, color: 'rgba(140,200,255,0.4)', fontWeight: 600 }}>a{a.attempt_id}</td>
                            <td style={{ ...TD, color: 'rgba(140,200,255,0.5)' }}>s{a.session_id}</td>
                            <td style={{ ...TD, color: '#60d4ff' }}>{a.topic_id}</td>
                            <td style={{ ...TD, color: '#c4b5fd', fontFamily: 'monospace' }}>{a.pattern_id}</td>
                            <td style={{ ...TD, color: '#e8f4ff', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.question_prompt}</td>
                            <td style={{ ...TD, color: a.is_correct ? '#06d6a0' : '#ff3d6b', fontWeight: 900, textAlign: 'center', fontSize: 14 }}>
                              {a.is_correct ? '✓' : '✗'}
                            </td>
                            <td style={{ ...TD, color: 'rgba(140,200,255,0.7)', fontFamily: 'monospace' }}>
                              {a.selected_answer ?? '—'} / {a.correct_answer}
                            </td>
                            <td style={{ ...TD, color: '#f59e0b' }}>{a.strategy}</td>
                            <td style={{ ...TD, color: '#e8f4ff', fontFamily: 'monospace' }}>{ms(a.time_to_answer_ms)}</td>
                            <td style={{ ...TD, color: 'rgba(140,200,255,0.65)', fontFamily: 'monospace' }}>{ms(a.time_to_first_interaction_ms)}</td>
                            <td style={{ ...TD, color: 'rgba(140,200,255,0.65)', fontFamily: 'monospace' }}>{ms(a.time_before_first_hover_ms)}</td>
                            <td style={{ ...TD, color: 'rgba(140,200,255,0.65)', fontFamily: 'monospace' }}>{ms(a.time_from_last_switch_to_submit_ms)}</td>
                            <td style={{ ...TD, color: '#60d4ff', textAlign: 'center' }}>{a.hover_count}</td>
                            <td style={{ ...TD, color: 'rgba(96,212,255,0.65)', fontFamily: 'monospace' }}>{a.hover_count ? ms(a.total_hover_duration_ms) : '—'}</td>
                            <td style={{ ...TD, color: '#f59e0b', textAlign: 'center' }}>{a.switch_count}</td>
                            <td style={{ ...TD, color: '#06d6a0', textAlign: 'center' }}>{a.review_count}</td>
                            <td style={{ ...TD, color: '#c4b5fd', textAlign: 'center' }}>{a.strength_change_count}</td>
                            <td style={{ ...TD, color: 'rgba(140,200,255,0.3)', textAlign: 'center', fontSize: 11 }}>
                              {hasEvents ? (isOpen ? '▲' : '▼') : ''}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${a.attempt_id}-detail`}>
                              <td colSpan={18} style={{ padding: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <AttemptDetail a={a} />
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────

export default function DataView() {
  const [stats,         setStats]         = useState<Stats | null>(null)
  const [dlUsers,       setDlUsers]       = useState<DatalakeUserSummary[]>([])
  const [loading,       setLoading]       = useState(true)
  const [dlLoading,     setDlLoading]     = useState(false)
  const [error,         setError]         = useState('')
  const [tab,           setTab]           = useState<'overview' | 'lake' | 'sessions' | 'users'>('overview')
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await api.getAdminStats()
      setStats(data)
    } catch {
      setError('Could not load — is the backend running?')
    } finally { setLoading(false) }
  }

  async function loadDatalake() {
    if (dlUsers.length > 0) return
    setDlLoading(true)
    try {
      const users = await api.getDatalakeUsers()
      setDlUsers(users)
    } catch { /* ignore */ }
    finally { setDlLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (tab === 'lake') loadDatalake()
  }, [tab])

  return (
    <div className="content-scroll">

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e8f4ff' }}>◉ Data Lake</div>
          <div style={{ fontSize: 12, color: 'rgba(0,190,255,0.5)', marginTop: 2 }}>
            Every event, attempt, and behavioral signal per user
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
            {([
              ['overview', 'Overview'],
              ['lake',     'Data Lake'],
              ['sessions', 'Sessions'],
              ['users',    'Users'],
            ] as [typeof tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: tab === key ? 'rgba(0,150,255,0.22)' : 'transparent',
                  color: tab === key ? '#60d4ff' : 'rgba(140,200,255,0.4)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)' }}>
                Last 30 Raw Events — click row to expand payload
              </div>
              {stats.recent_events.map(ev => {
                const color = EVENT_COLORS[ev.type] ?? '#888'
                const isOpen = expandedEvent === ev.id
                return (
                  <div key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div
                      onClick={() => setExpandedEvent(isOpen ? null : ev.id)}
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
                        <pre style={{ margin: 0, padding: '12px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#a0d4ff', overflow: 'auto', fontFamily: '"Courier New", monospace', lineHeight: 1.6, maxHeight: 220 }}>
                          {JSON.stringify(ev.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── DATA LAKE TAB ── */}
          {tab === 'lake' && (
            dlLoading
              ? <div style={{ color: 'rgba(140,200,255,0.4)', textAlign: 'center', padding: 40 }}>Loading users…</div>
              : dlUsers.length === 0
                ? <div className="glass" style={{ padding: 32, textAlign: 'center', color: 'rgba(140,200,255,0.4)' }}>No users yet.</div>
                : <DataLakeView users={dlUsers} />
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
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.sessions.map((s, i) => (
                      <tr key={s.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,100,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ ...TD, color: 'rgba(140,200,255,0.45)' }}>#{s.id}</td>
                        <td style={{ ...TD, color: '#e8f4ff', fontWeight: 600 }}>u{s.user_id}</td>
                        <td style={{ ...TD, color: '#60d4ff' }}>{s.topic_id}</td>
                        <td style={{ ...TD, color: 'rgba(140,200,255,0.5)' }}>{ts(s.started_at)}</td>
                        <td style={{ ...TD, color: '#e8f4ff', textAlign: 'center' }}>{s.attempts_count}</td>
                        <td style={{ ...TD, color: '#06d6a0', textAlign: 'center' }}>{s.correct_count}</td>
                        <td style={{ ...TD, color: accColor(s.accuracy), fontWeight: 800, textAlign: 'center' }}>{s.accuracy ? s.accuracy.toFixed(0) : '—'}</td>
                        <td style={{ ...TD, color: '#f59e0b', textAlign: 'center' }}>+{s.xp_gained}</td>
                        <td style={{ ...TD, color: '#60d4ff', textAlign: 'center' }}>{s.hovers_count}</td>
                        <td style={{ ...TD, color: '#f59e0b', textAlign: 'center' }}>{s.switches_count}</td>
                        <td style={{ ...TD, color: '#06d6a0', textAlign: 'center' }}>{s.reviews_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,190,255,0.5)' }}>
                All Users
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['ID','Username','XP','Sessions','Accuracy%','Level'].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.users.map((u, i) => (
                    <tr key={u.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,100,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ ...TD, color: 'rgba(140,200,255,0.45)' }}>#{u.id}</td>
                      <td style={{ ...TD, color: '#e8f4ff', fontWeight: 700 }}>{u.username}</td>
                      <td style={{ ...TD, color: '#f59e0b', fontWeight: 800 }}>{u.total_xp.toLocaleString()}</td>
                      <td style={{ ...TD, color: '#60d4ff', textAlign: 'center' }}>{u.total_sessions}</td>
                      <td style={{ ...TD, color: accColor(u.overall_accuracy), fontWeight: 800, textAlign: 'center' }}>
                        {u.overall_accuracy ? u.overall_accuracy.toFixed(1) : '—'}
                      </td>
                      <td style={{ ...TD }}>
                        <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(0,150,255,0.15)', border: '1px solid rgba(0,150,255,0.3)', color: '#60d4ff', fontSize: 11, fontWeight: 700 }}>
                          Lv {u.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ height: 48 }} />
        </>
      )}
    </div>
  )
}