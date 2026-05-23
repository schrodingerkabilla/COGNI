import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TOPICS } from '../data'
import type { Screen } from '../types'

interface Props {
  topicId: string
  onNav: (s: Screen) => void
}

function MasteryRingLarge({ value, color }: { value: number; color: string }) {
  const size = 120, r = 46
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  )
}

function masteryStatus(m: number) {
  if (m >= 75) return { label: 'Strong',      color: '#06d6a0' }
  if (m >= 50) return { label: 'Developing',  color: '#f59e0b' }
  return              { label: 'Needs Work',  color: '#ff3d6b' }
}

export default function TopicDetail({ topicId, onNav }: Props) {
  const topic = TOPICS.find(t => t.id === topicId)
  if (!topic) return null

  const status = masteryStatus(topic.mastery)
  const related = TOPICS.filter(t =>
    t.id !== topicId && (t.dependencies.includes(topicId) || topic.dependencies.includes(t.id))
  )

  return (
    <div className="content-scroll">
      {/* Back */}
      <button
        onClick={() => onNav('graph')}
        style={{
          background: 'none', border: 'none', padding: 0, marginBottom: 20,
          color: 'rgba(0,190,255,0.55)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#c4b5fd')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,190,255,0.55)')}
      >
        ← Back to Knowledge Map
      </button>

      {/* Hero — CSS class handles mobile stack */}
      <div className="glass topic-hero">
        <div style={{ position: 'relative', flexShrink: 0, width: 120, height: 120 }}>
          <MasteryRingLarge value={topic.mastery} color={topic.color} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{topic.icon}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: topic.color, lineHeight: 1.2 }}>{topic.mastery}%</span>
          </div>
        </div>

        <div className="topic-hero-info">
          <div className="screen-page-title" style={{ fontSize: 26, fontWeight: 800, color: '#e8f4ff', marginBottom: 6 }}>
            {topic.name}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40`,
            }}>{status.label}</span>
            <span style={{ fontSize: 12, color: 'rgba(140,200,255,0.45)' }}>
              {topic.xp.toLocaleString()} XP earned
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => onNav('practice')}>▶ Start Practice</button>
            <button
              onClick={() => onNav('quiz')}
              style={{
                padding: '11px 22px', borderRadius: 12,
                border: '1px solid rgba(0,150,255,0.3)',
                background: 'rgba(0,100,255,0.1)', color: '#60d4ff',
                fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>⚡ Quick Quiz</button>
          </div>
        </div>

        <div className="topic-hero-stats">
          {[
            { label: 'Patterns',  value: topic.weakPatterns.length,         color: '#ff3d6b' },
            { label: 'Tracked',   value: `${topic.history.length} days`,     color: '#00d4ff' },
            { label: 'Linked',    value: topic.dependencies.length + ' topics', color: '#a78bfa' },
          ].map(s => (
            <div key={s.label}>
              <div className="section-label" style={{ marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid — CSS class handles mobile stack */}
      <div className="topic-grid">
        {/* Weak patterns */}
        <div className="glass" style={{ padding: '20px 22px' }}>
          <div className="section-label">Detected Weak Patterns</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {topic.weakPatterns.map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff' }}>{p.name}</div>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: p.frequency > 65 ? '#ff3d6b' : '#f59e0b',
                    marginLeft: 8, flexShrink: 0,
                  }}>{p.frequency}%</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)', marginBottom: 8 }}>
                  {p.description}
                </div>
                <div className="pattern-bar-track">
                  <div
                    className="pattern-bar-fill"
                    style={{
                      width: `${p.frequency}%`,
                      background: p.frequency > 65
                        ? 'linear-gradient(90deg,#ff3d6b,#ff6b8a)'
                        : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress chart */}
        <div className="glass" style={{ padding: '20px 22px' }}>
          <div className="section-label">Mastery Progress</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={topic.history} margin={{ top: 4, right: 8, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${topic.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={topic.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={topic.color} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'rgba(140,200,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill: 'rgba(140,200,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#03080f', border: '1px solid rgba(0,150,255,0.35)', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [`${v}%`, 'Mastery']}
              />
              <Area
                type="monotone" dataKey="mastery"
                stroke={topic.color} strokeWidth={2}
                fill={`url(#grad-${topic.id})`}
                dot={{ fill: topic.color, r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Related topics — spans full width */}
        {related.length > 0 && (
          <div className="glass" style={{ padding: '20px 22px', gridColumn: '1 / -1' }}>
            <div className="section-label">Related Topics</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {related.map(t => (
                <div
                  key={t.id}
                  onClick={() => onNav('topic' as Screen)}
                  style={{
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${t.color}30`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  <span style={{ fontSize: 18, color: t.color }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)' }}>
                      {topic.dependencies.includes(t.id) ? 'Prerequisite' : 'Builds on this'}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: t.color }}>{t.mastery}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
