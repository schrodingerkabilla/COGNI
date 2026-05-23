import { useState, useCallback, useRef } from 'react'
import { TOPICS } from '../data'
import { generateQuestions } from '../utils/questionGen'
import type { Question, SolutionStep } from '../utils/questionGen'
import type { Screen } from '../types'

interface Props {
  onNav: (s: Screen) => void
}

interface QWithTopic {
  q: Question
  topicId: string
  topicColor: string
  topicIcon: string
  topicName: string
}

function nextRandom(): QWithTopic {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
  const questions = generateQuestions(topic.id, 6)
  const q = questions[Math.floor(Math.random() * questions.length)]
  return { q, topicId: topic.id, topicColor: topic.color, topicIcon: topic.icon, topicName: topic.name }
}

/* ── Transparent step box with draggable strength overlay ── */
function StepBox({
  step, stepNum, topicColor, confKey, value, onChange,
}: {
  step: SolutionStep
  stepNum: number
  topicColor: string
  confKey: string
  value: number
  onChange: (key: string, v: number) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateFromX = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    onChange(confKey, Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    boxRef.current?.setPointerCapture(e.pointerId)
    updateFromX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (dragging.current) updateFromX(e.clientX) }
  const onPointerUp   = () => { dragging.current = false }

  const barColor = value >= 75 ? '#06d6a0' : value >= 50 ? '#f59e0b' : '#ff3d6b'

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'relative', borderRadius: 12, overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        cursor: 'ew-resize', userSelect: 'none', touchAction: 'none',
      }}
    >
      {/* Step content */}
      <div style={{ padding: '14px 16px', position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${topicColor}22`, border: `1px solid ${topicColor}50`,
            fontSize: 11, fontWeight: 800, color: topicColor,
          }}>{stepNum}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f4ff', marginBottom: 3 }}>{step.title}</div>
            <div style={{ fontSize: 12, color: 'rgba(140,200,255,0.7)', fontFamily: '"Courier New", monospace' }}>{step.detail}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              <span style={{ fontSize: 10, color: 'rgba(140,200,255,0.35)' }}>→</span>
              <span style={{
                fontSize: 13, fontWeight: 800, color: topicColor,
                fontFamily: '"Courier New", monospace',
                padding: '1px 8px', borderRadius: 6,
                background: `${topicColor}14`, border: `1px solid ${topicColor}28`,
              }}>{step.result}</span>
            </div>
            {step.tip && (
              <div style={{
                marginTop: 6, fontSize: 11, color: 'rgba(0,180,255,0.55)',
                padding: '3px 8px', borderRadius: 5,
                background: 'rgba(0,100,255,0.07)', border: '1px solid rgba(0,150,255,0.12)',
                display: 'inline-block',
              }}>💡 {step.tip}</div>
            )}
          </div>
        </div>
      </div>

      {/* Transparent fill overlay */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: `${value}%`, background: `${barColor}18`,
        zIndex: 2, pointerEvents: 'none', transition: 'background 0.3s',
      }} />

      {/* Vertical drag line */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${value}%`, width: 2,
        background: `linear-gradient(180deg, transparent 0%, ${barColor}90 20%, ${barColor} 50%, ${barColor}90 80%, transparent 100%)`,
        boxShadow: `0 0 10px ${barColor}60`,
        zIndex: 3, pointerEvents: 'none', transform: 'translateX(-1px)',
      }} />

      {/* Strength pill on handle */}
      <div style={{
        position: 'absolute', top: '50%', left: `${value}%`,
        transform: 'translate(-50%, -50%)',
        padding: '2px 7px', borderRadius: 20,
        background: barColor, color: '#020a14',
        fontSize: 10, fontWeight: 900, letterSpacing: 0.4,
        zIndex: 4, pointerEvents: 'none',
        boxShadow: `0 0 10px ${barColor}70`, whiteSpace: 'nowrap',
      }}>{value}%</div>
    </div>
  )
}

/* ── Focus hint ────────────────────────────────────────── */
function FocusHint({ current }: { current: QWithTopic }) {
  const topic  = TOPICS.find(t => t.id === current.topicId)
  const weak   = topic?.weakPatterns.find(p => p.id === current.q.patternId)

  const isWeak = !!weak
  const label  = weak ? weak.name : current.q.strategy
  const desc   = weak ? `Appears in ${weak.frequency}% of your mistakes` : 'Key technique for this problem type'
  const accent = isWeak ? '#f59e0b' : current.topicColor

  return (
    <div style={{
      width: '100%', maxWidth: 560, marginBottom: 12,
      padding: '10px 16px', borderRadius: 12,
      background: `${accent}0e`,
      border: `1px solid ${accent}30`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{isWeak ? '⚠' : '🎯'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 2 }}>
          {isWeak ? 'Known Weak Area' : 'Focus Point'}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f4ff', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(140,200,255,0.5)' }}>{desc}</div>
      </div>
      {isWeak && (
        <div style={{
          flexShrink: 0, padding: '3px 10px', borderRadius: 20,
          background: `${accent}18`, border: `1px solid ${accent}35`,
          fontSize: 11, fontWeight: 800, color: accent,
        }}>
          {weak.frequency}%
        </div>
      )}
    </div>
  )
}

/* ── Main component ────────────────────────────────────── */
export default function QuickQuiz({ onNav }: Props) {
  const [current, setCurrent]  = useState<QWithTopic>(nextRandom)
  const [selected, setSel]     = useState<number | null>(null)
  const [correct,  setCorrect] = useState(0)
  const [total,    setTotal]   = useState(0)
  const [conf, setConf]        = useState<Record<string, number>>({})

  const { q, topicColor, topicIcon, topicName } = current
  const revealed = selected !== null
  const isRight  = selected === q.answer

  const submit = useCallback((choice: number) => {
    if (revealed) return
    setSel(choice)
    setTotal(t => t + 1)
    setCorrect(c => c + (choice === q.answer ? 1 : 0))
    // init confidence for each step at 100
    const init: Record<string, number> = {}
    q.steps.forEach((_, i) => { init[String(i)] = 100 })
    setConf(init)
  }, [revealed, q])

  const next = useCallback(() => {
    setSel(null)
    setConf({})
    setCurrent(nextRandom())
  }, [])

  const setStepConf = useCallback((id: string, v: number) => {
    setConf(c => ({ ...c, [id]: v }))
  }, [])

  const acc = total === 0 ? 100 : Math.round((correct / total) * 100)
  const accColor = acc >= 75 ? '#06d6a0' : acc >= 50 ? '#f59e0b' : '#ff3d6b'

  return (
    <div className="content-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 560, marginBottom: 20, gap: 12 }}>
        <button
          onClick={() => onNav('dashboard')}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'rgba(0,190,255,0.5)', fontSize: 13, fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#60d4ff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,190,255,0.5)')}
        >← Back</button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: topicColor }}>
            {topicIcon} {topicName}
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 20,
          background: 'rgba(0,100,255,0.1)', border: '1px solid rgba(0,150,255,0.22)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: accColor }}>{acc}%</span>
          <span style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)' }}>{correct}/{total}</span>
        </div>
      </div>

      {/* ── Focus hint box ── */}
      <FocusHint current={current} />

      {/* Question card */}
      <div className="glass" style={{ width: '100%', maxWidth: 560, padding: '28px 32px', marginBottom: 14 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
          color: topicColor, opacity: 0.75, marginBottom: 18,
        }}>
          Mixed Practice
        </div>
        <div style={{
          fontSize: 34, fontWeight: 900, color: '#e8f4ff', textAlign: 'center',
          letterSpacing: '-0.5px', lineHeight: 1.2, paddingBottom: 4,
        }}>
          {q.prompt}
        </div>
      </div>

      {/* Choices 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 560, marginBottom: 16 }}>
        {q.choices.map(choice => {
          const isSel = selected === choice
          const isAns = choice === q.answer

          let bg     = 'rgba(0,100,255,0.07)'
          let border = 'rgba(0,150,255,0.2)'
          let color  = '#e8f4ff'
          let shadow = 'none'

          if (revealed && isAns) {
            bg = 'rgba(6,214,160,0.15)'; border = '#06d6a0'; color = '#06d6a0'
            shadow = '0 0 24px rgba(6,214,160,0.35)'
          } else if (revealed && isSel && !isRight) {
            bg = 'rgba(255,61,107,0.15)'; border = '#ff3d6b'; color = '#ff3d6b'
            shadow = '0 0 24px rgba(255,61,107,0.3)'
          } else if (revealed) {
            bg = 'rgba(0,100,255,0.04)'; border = 'rgba(0,150,255,0.1)'; color = 'rgba(180,220,255,0.3)'
          }

          return (
            <button
              key={choice}
              onClick={() => submit(choice)}
              disabled={revealed}
              style={{
                padding: '22px 16px', borderRadius: 14,
                border: `2px solid ${border}`,
                background: bg, color, boxShadow: shadow,
                fontSize: 24, fontWeight: 900,
                fontFamily: 'inherit',
                cursor: revealed ? 'default' : 'pointer',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                if (!revealed) {
                  e.currentTarget.style.background = 'rgba(0,150,255,0.15)'
                  e.currentTarget.style.borderColor = 'rgba(0,200,255,0.45)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={e => {
                if (!revealed) {
                  e.currentTarget.style.background = 'rgba(0,100,255,0.07)'
                  e.currentTarget.style.borderColor = 'rgba(0,150,255,0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {/* ── Inline solution widget ── */}
      {revealed && (
        <div style={{ width: '100%', maxWidth: 560, animation: 'screenEnter 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>

          {/* Result banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
            padding: '12px 18px', borderRadius: 12,
            background: isRight ? 'rgba(6,214,160,0.12)' : 'rgba(255,61,107,0.12)',
            border: `1px solid ${isRight ? 'rgba(6,214,160,0.3)' : 'rgba(255,61,107,0.3)'}`,
          }}>
            <span style={{ fontSize: 20 }}>{isRight ? '✓' : '✗'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: isRight ? '#06d6a0' : '#ff3d6b' }}>
                {isRight ? 'Correct!' : `Answer: ${q.answer}`}
              </div>
              {!isRight && (
                <div style={{ fontSize: 12, color: 'rgba(180,220,255,0.5)', marginTop: 2 }}>
                  You picked {selected}
                </div>
              )}
            </div>
            <div style={{
              marginLeft: 'auto',
              padding: '3px 10px', borderRadius: 20,
              background: `${topicColor}18`, border: `1px solid ${topicColor}35`,
              fontSize: 11, fontWeight: 700, color: topicColor, whiteSpace: 'nowrap',
            }}>
              {q.strategy}
            </div>
          </div>

          {/* Steps with transparent strength overlay */}
          <div className="glass" style={{ padding: '18px 20px', marginBottom: 14 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
              color: 'rgba(0,190,255,0.6)', marginBottom: 14,
            }}>
              Quickest Way
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.steps.map((step, i) => (
                <StepBox
                  key={i}
                  step={step}
                  stepNum={i + 1}
                  topicColor={topicColor}
                  confKey={String(i)}
                  value={conf[String(i)] ?? 100}
                  onChange={setStepConf}
                />
              ))}
            </div>
          </div>

          {/* Next button */}
          <button
            className="btn-primary"
            onClick={next}
            style={{ width: '100%', justifyContent: 'center', fontSize: 15 }}
          >
            Next Question →
          </button>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  )
}
