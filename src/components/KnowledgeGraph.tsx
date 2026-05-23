import { useState } from 'react'
import { TOPICS } from '../data'

interface Props {
  onTopicClick: (id: string) => void
}

const EDGES = TOPICS.flatMap(t => t.dependencies.map(dep => ({ from: dep, to: t.id })))

function masteryColor(m: number) {
  if (m >= 75) return '#06d6a0'
  if (m >= 50) return '#f59e0b'
  return '#ff3d6b'
}
function masteryLabel(m: number) {
  if (m >= 75) return 'Strong'
  if (m >= 50) return 'Developing'
  return 'Weak'
}

const POPUP_W = 192
const POPUP_H = 158
const VB_W    = 700
const VB_H    = 530

const EDGE_SW_MIN        = 0.5   // px — thinnest edge (both nodes at 0% mastery)
const EDGE_SW_MAX        = 3.5   // px — thickest edge (both nodes at 100% mastery)
const EDGE_ALPHA_MIN     = 0.08  // opacity at minimum weight
const EDGE_ALPHA_MAX     = 0.40  // opacity at maximum weight
const EDGE_DASH_THRESHOLD = 0.55 // weight below this gets a dashed stroke
const EDGE_HI_BOOST      = 1.2  // extra px added when edge is highlighted

export default function KnowledgeGraph({ onTopicClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  const topicMap    = Object.fromEntries(TOPICS.map(t => [t.id, t]))
  const hoveredTopic = hovered ? topicMap[hovered] : null

  /* clamp popup so it never exits the viewBox */
  const popupX = hoveredTopic
    ? Math.min(Math.max(hoveredTopic.x - POPUP_W / 2, 6), VB_W - POPUP_W - 6)
    : 0
  const popupY = hoveredTopic
    ? Math.min(Math.max(hoveredTopic.y - POPUP_H - 52, 6), VB_H - POPUP_H - 6)
    : 0

  return (
    <div className="content-scroll" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 20 }}>
        <div className="screen-page-title" style={{
          fontSize: 24, fontWeight: 900, marginBottom: 6,
          background: 'linear-gradient(135deg, #ffffff 0%, #60d4ff 50%, #0088ff 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          display: 'inline-block',
        }}>
          Knowledge Map
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,170,255,0.5)', fontWeight: 500 }}>
          Hover a topic to preview · click to drill in
        </div>
      </div>

      <div className="graph-layout">
        {/* SVG Graph */}
        <div className="glass graph-canvas-wrap">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, minWidth: 340 }}
          >
            {/* Edges — thickness weighted by avg mastery of connected nodes */}
            {EDGES.map((e, i) => {
              const from = topicMap[e.from]
              const to   = topicMap[e.to]
              if (!from || !to) return null

              const hi     = hovered === e.from || hovered === e.to
              const weight = (from.mastery + to.mastery) / 200
              const sw     = EDGE_SW_MIN + weight * (EDGE_SW_MAX - EDGE_SW_MIN)
              const alpha  = EDGE_ALPHA_MIN + weight * (EDGE_ALPHA_MAX - EDGE_ALPHA_MIN)
              const dashes = weight < EDGE_DASH_THRESHOLD ? '5 5' : ''

              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={hi
                    ? `rgba(0,200,255,0.75)`
                    : `rgba(0,160,255,${alpha})`
                  }
                  strokeWidth={hi ? sw + EDGE_HI_BOOST : sw}
                  strokeDasharray={hi ? '' : dashes}
                  strokeLinecap="round"
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />
              )
            })}

            {/* Nodes */}
            {TOPICS.map(t => {
              const hi   = hovered === t.id
              const r    = t.id === 'number-sense' ? 34 : 26
              const mc   = masteryColor(t.mastery)
              const circ = 2 * Math.PI * r
              const dash = (t.mastery / 100) * circ

              return (
                <g
                  key={t.id}
                  className="graph-node"
                  onClick={() => onTopicClick(t.id)}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  onTouchStart={() => setHovered(t.id)}
                >
                  {hi && <circle cx={t.x} cy={t.y} r={r + 14} fill="none" stroke={t.color} strokeWidth={1.5} opacity={0.35} />}
                  {hi && <circle cx={t.x} cy={t.y} r={r + 24} fill="none" stroke={t.color} strokeWidth={0.5} opacity={0.12} />}

                  <circle className="node-bg" cx={t.x} cy={t.y} r={r} fill="rgba(5,12,28,0.92)" stroke="rgba(0,150,255,0.25)" strokeWidth={1.5} />

                  <circle
                    cx={t.x} cy={t.y} r={r - 3}
                    fill="none" stroke={mc} strokeWidth={4}
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${t.x} ${t.y})`}
                    opacity={hi ? 1 : 0.7}
                    style={{ transition: 'opacity 0.2s' }}
                  />

                  <text x={t.x} y={t.y - 6} textAnchor="middle" dominantBaseline="middle"
                    fontSize={t.id === 'number-sense' ? 18 : 14} fill={t.color} opacity={0.9}>
                    {t.icon}
                  </text>
                  <text x={t.x} y={t.y + 9} textAnchor="middle" fontSize={9} fill="rgba(220,240,255,0.65)" fontWeight={600}>
                    {t.mastery}%
                  </text>
                  <text
                    x={t.x} y={t.y + r + 14} textAnchor="middle" fontSize={10}
                    fill={hi ? '#dff4ff' : 'rgba(200,230,255,0.5)'}
                    fontWeight={hi ? 700 : 400}
                    style={{ transition: 'fill 0.2s' }}
                  >
                    {t.name}
                  </text>
                </g>
              )
            })}

            {/* Floating hover popup via foreignObject */}
            {hoveredTopic && (
              <foreignObject
                x={popupX} y={popupY}
                width={POPUP_W} height={POPUP_H}
                style={{ pointerEvents: 'none', overflow: 'visible' }}
              >
                <div style={{
                  background: 'rgba(4, 10, 24, 0.96)',
                  border: `1px solid ${hoveredTopic.color}55`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  backdropFilter: 'blur(24px)',
                  boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 24px ${hoveredTopic.color}22`,
                  width: POPUP_W,
                  animation: 'popupIn 0.15s cubic-bezier(0.16,1,0.3,1) both',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{hoveredTopic.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#dff4ff', lineHeight: 1.2 }}>{hoveredTopic.name}</div>
                      <div style={{ fontSize: 11, color: masteryColor(hoveredTopic.mastery), fontWeight: 600, marginTop: 1 }}>
                        {masteryLabel(hoveredTopic.mastery)}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 800, color: hoveredTopic.color, lineHeight: 1 }}>
                      {hoveredTopic.mastery}%
                    </div>
                  </div>

                  {/* Mastery bar */}
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${hoveredTopic.mastery}%`,
                      background: hoveredTopic.color,
                      boxShadow: `0 0 8px ${hoveredTopic.color}80`,
                    }} />
                  </div>

                  {/* Top weakness */}
                  {hoveredTopic.weakPatterns[0] && (
                    <div style={{
                      fontSize: 11, color: 'rgba(180,220,255,0.6)',
                      paddingLeft: 8, borderLeft: `2px solid ${hoveredTopic.color}55`,
                      marginBottom: 10, lineHeight: 1.4,
                    }}>
                      ⚠ {hoveredTopic.weakPatterns[0].name}
                    </div>
                  )}

                  {/* Hint */}
                  <div style={{ fontSize: 10, color: 'rgba(0,180,255,0.45)', fontWeight: 600, letterSpacing: 0.4 }}>
                    CLICK TO VIEW DETAILS →
                  </div>
                </div>
              </foreignObject>
            )}
          </svg>
        </div>

        {/* Side panel — hidden on mobile via CSS */}
        <div className="graph-side-panel">
          {/* Legend */}
          <div className="glass" style={{ padding: '16px 18px' }}>
            <div className="section-label">Legend</div>
            {[
              { label: 'Strong (75%+)',       color: '#06d6a0' },
              { label: 'Developing (50–74%)', color: '#f59e0b' },
              { label: 'Weak (<50%)',          color: '#ff3d6b' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(180,220,255,0.7)' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Hover info / placeholder */}
          {hoveredTopic ? (
            <div className="glass" style={{ padding: '16px 18px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22, color: hoveredTopic.color }}>{hoveredTopic.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#dff4ff' }}>{hoveredTopic.name}</div>
                  <div style={{ fontSize: 12, color: masteryColor(hoveredTopic.mastery), fontWeight: 600 }}>
                    {masteryLabel(hoveredTopic.mastery)}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="section-label">Mastery</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: hoveredTopic.color }}>{hoveredTopic.mastery}%</div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="section-label">Top Weakness</div>
                {hoveredTopic.weakPatterns.slice(0, 2).map(p => (
                  <div key={p.id} style={{
                    fontSize: 12, color: 'rgba(180,220,255,0.65)', marginBottom: 5,
                    paddingLeft: 8, borderLeft: `2px solid ${hoveredTopic.color}40`,
                  }}>{p.name}</div>
                ))}
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '10px 16px' }}
                onClick={() => onTopicClick(hoveredTopic.id)}
              >
                View Details →
              </button>
            </div>
          ) : (
            <div className="glass" style={{
              padding: '16px 18px', flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center', color: 'rgba(0,180,255,0.3)', fontSize: 13 }}>
                Hover a topic<br />to see details
              </div>
            </div>
          )}

          {/* Overall stats */}
          <div className="glass" style={{ padding: '14px 18px' }}>
            <div className="section-label">Overview</div>
            <div style={{ fontSize: 12, color: 'rgba(180,220,255,0.6)', lineHeight: 2.2 }}>
              <div>Topics: <span style={{ color: '#dff4ff', fontWeight: 600 }}>{TOPICS.length}</span></div>
              <div>Avg mastery: <span style={{ color: '#00d4ff', fontWeight: 600 }}>
                {Math.round(TOPICS.reduce((s, t) => s + t.mastery, 0) / TOPICS.length)}%
              </span></div>
              <div>Weak topics: <span style={{ color: '#ff3d6b', fontWeight: 600 }}>
                {TOPICS.filter(t => t.mastery < 50).length}
              </span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: compact topic list below graph */}
      <div style={{ marginTop: 16 }}>
        <div className="section-label">Topics</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TOPICS.map(t => (
            <button
              key={t.id}
              className="topic-pill"
              onClick={() => onTopicClick(t.id)}
              style={{ borderColor: `${masteryColor(t.mastery)}44`, color: masteryColor(t.mastery) }}
            >
              <span>{t.icon}</span>
              {t.name}
              <span style={{ fontSize: 11, opacity: 0.65 }}>{t.mastery}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
