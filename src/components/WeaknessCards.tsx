import { useState } from 'react'

interface Card {
  id:              string
  title:           string
  body:            string
  severity:        'high' | 'medium'
  wrong_questions: string[]
  evidence:        string
}

interface Props {
  cards: Card[]
}

export default function WeaknessCards({ cards }: Props) {
  const [idx,      setIdx]      = useState(0)
  const [expanded, setExpanded] = useState(false)

  if (!cards || cards.length === 0) return null

  const card    = cards[idx]
  const isHigh  = card.severity === 'high'
  const accent  = isHigh ? '#ff3d6b' : '#f59e0b'
  const bg      = isHigh ? 'rgba(255,61,107,0.08)' : 'rgba(245,158,11,0.08)'
  const border  = isHigh ? 'rgba(255,61,107,0.28)' : 'rgba(245,158,11,0.28)'

  const prev = () => { setIdx(i => (i - 1 + cards.length) % cards.length); setExpanded(false) }
  const next = () => { setIdx(i => (i + 1) % cards.length); setExpanded(false) }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(140,200,255,0.45)', letterSpacing: 1, marginBottom: 10 }}>
        YOUR WEAK SPOTS
      </div>

      {/* Card */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '18px 20px', borderRadius: 16, cursor: 'pointer',
          background: bg, border: `1px solid ${border}`,
          transition: 'all 0.2s',
          userSelect: 'none',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 16, fontWeight: 800, color: accent,
              textShadow: `0 0 20px ${accent}50`, marginBottom: 4,
            }}>
              {card.title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(220,220,255,0.75)', lineHeight: 1.5 }}>
              {card.body}
            </div>
          </div>
          <div style={{
            fontSize: 18, color: 'rgba(140,200,255,0.4)',
            marginLeft: 12, flexShrink: 0, marginTop: 2,
          }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>

        {/* Navigation dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <button onClick={e => { e.stopPropagation(); prev() }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(140,200,255,0.5)', fontSize: 16, padding: '0 4px',
            lineHeight: 1,
          }}>←</button>

          {cards.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); setExpanded(false) }}
              style={{
                width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
                background: i === idx ? accent : 'rgba(255,255,255,0.15)',
                cursor: 'pointer', transition: 'all 0.2s',
              }} />
          ))}

          <button onClick={e => { e.stopPropagation(); next() }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(140,200,255,0.5)', fontSize: 16, padding: '0 4px',
            lineHeight: 1,
          }}>→</button>

          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(140,200,255,0.35)', fontWeight: 600 }}>
            {idx + 1} / {cards.length} · tap to expand
          </span>
        </div>

        {/* Expanded: wrong questions + evidence */}
        {expanded && (
          <div style={{
            marginTop: 16, paddingTop: 16,
            borderTop: `1px solid ${border}`,
          }}
            onClick={e => e.stopPropagation()}
          >
            {/* Evidence */}
            <div style={{
              fontSize: 11, color: accent, fontWeight: 700,
              letterSpacing: 0.5, marginBottom: 8,
            }}>
              HOW WE KNOW
            </div>
            <div style={{
              fontSize: 12, color: 'rgba(200,200,255,0.65)',
              lineHeight: 1.6, marginBottom: 14,
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(0,0,0,0.2)',
            }}>
              {card.evidence}
            </div>

            {/* Wrong questions */}
            {card.wrong_questions.length > 0 && (
              <>
                <div style={{
                  fontSize: 11, color: accent, fontWeight: 700,
                  letterSpacing: 0.5, marginBottom: 8,
                }}>
                  QUESTIONS YOU GOT WRONG
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {card.wrong_questions.map((q, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,61,107,0.07)',
                      border: '1px solid rgba(255,61,107,0.15)',
                      fontSize: 13, color: '#e8f4ff', fontWeight: 600,
                    }}>
                      {q}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
