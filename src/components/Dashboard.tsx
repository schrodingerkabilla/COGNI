import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TOPICS, DAILY_ACTIVITY } from '../data'
import type { AppState } from '../types'

interface Props {
  state: AppState
  onTopicClick: (id: string) => void
}

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    setVal(0)
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return val
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  const isNum = typeof value === 'number'
  const animated = useCountUp(isNum ? value : 0)
  const display = isNum ? animated.toLocaleString() : value
  return (
    <div className="glass stat-card" style={{ borderColor: `${color}28` }}>
      <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="stat-value" style={{ color, textShadow: `0 0 24px ${color}60` }}>{display}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.38)', marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

function MasteryRing({ value, color, size = 44 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width={size} height={size} className="mastery-ring" style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  )
}

const TOP_WEAK_PATTERNS = TOPICS
  .flatMap(t => t.weakPatterns.map(p => ({ ...p, topicName: t.name, topicColor: t.color })))
  .sort((a, b) => b.frequency - a.frequency).slice(0, 4)

const FOCUS_TOPICS = [...TOPICS].sort((a, b) => a.mastery - b.mastery).slice(0, 4)

export default function Dashboard({ state, onTopicClick }: Props) {
  const streakNum   = useCountUp(state.streak)
  const accuracyNum = useCountUp(state.accuracy)

  return (
    <div className="content-scroll">
      <div style={{ marginBottom: 24 }}>
        <div className="screen-page-title" style={{
          fontSize: 26, fontWeight: 900, marginBottom: 6,
          background: 'linear-gradient(135deg, #ffffff 0%, #60d4ff 50%, #0088ff 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          display: 'inline-block',
        }}>
          Let's sharpen those skills ⚡
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,190,255,0.55)', fontWeight: 500 }}>
          Patterns tracked · Focus areas updated · Keep the streak alive
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Total XP"  value={state.totalXp}      sub="lifetime"        color="#00d4ff" />
        <StatCard label="Streak"    value={`${streakNum} days`} sub="keep going!"     color="#f59e0b" />
        <StatCard label="Sessions"  value={state.totalSessions} sub="this week"       color="#06d6a0" />
        <StatCard label="Accuracy"  value={`${accuracyNum}%`}   sub="avg last 7 days" color="#a78bfa" />
      </div>

      <div className="dash-grid">
        <div className="glass" style={{ padding: '20px 22px' }}>
          <div className="section-label">Pattern Alerts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TOP_WEAK_PATTERNS.map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff' }}>{p.name}</span>
                    <span style={{
                      marginLeft: 8, fontSize: 11, padding: '2px 7px', borderRadius: 10,
                      background: 'rgba(0,100,255,0.15)', color: 'rgba(140,200,255,0.6)',
                      whiteSpace: 'nowrap',
                    }}>{p.topicName}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p.topicColor, flexShrink: 0, marginLeft: 8 }}>
                    {p.frequency}%
                  </span>
                </div>
                <div className="pattern-bar-track">
                  <div className="pattern-bar-fill" style={{ width: `${p.frequency}%`, background: p.topicColor, opacity: 0.85 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ padding: '20px 22px' }}>
          <div className="section-label">Focus Areas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FOCUS_TOPICS.map(t => (
              <div key={t.id} onClick={() => onTopicClick(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(0,100,255,0.06)',
                  border: '1px solid rgba(0,140,255,0.1)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,130,255,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,100,255,0.06)')}
              >
                <MasteryRing value={t.mastery} color={t.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff', marginBottom: 1 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,190,255,0.5)' }}>
                    {t.weakPatterns.length} pattern{t.weakPatterns.length !== 1 ? 's' : ''} detected
                  </div>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: t.color, flexShrink: 0 }}>{t.mastery}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <div className="section-label">Weekly Activity</div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={DAILY_ACTIVITY} margin={{ top: 4, right: 8, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: 'rgba(0,190,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(0,190,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#03080f', border: '1px solid rgba(0,150,255,0.35)', borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: '#60d4ff' }}
            />
            <Area type="monotone" dataKey="xp" stroke="#00d4ff" strokeWidth={2} fill="url(#xpGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="section-label">All Topics</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TOPICS.map(t => (
            <button key={t.id} className="topic-pill" onClick={() => onTopicClick(t.id)}
              style={{ borderColor: `${t.color}44`, color: t.color }}>
              <span>{t.icon}</span>{t.name}
              <span style={{ fontSize: 11, opacity: 0.65 }}>{t.mastery}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
