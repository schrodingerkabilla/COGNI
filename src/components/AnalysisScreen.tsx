import { useState, useRef, useCallback } from 'react'
import type { Question, SolutionStep } from '../utils/questionGen'

interface Props {
  questions: Question[]
  answers: (number | null)[]
  topicName: string
  topicIcon: string
  topicColor: string
  onBack: () => void
}

function StepBox({
  step, stepNum, topicColor,
  confKey, value, onChange,
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
    const pct = Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100)
    onChange(confKey, pct)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    boxRef.current?.setPointerCapture(e.pointerId)
    updateFromX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    updateFromX(e.clientX)
  }
  const onPointerUp = () => { dragging.current = false }

  const barColor = value >= 75 ? '#06d6a0' : value >= 50 ? '#f59e0b' : '#ff3d6b'

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid rgba(255,255,255,0.07)`,
        cursor: 'ew-resize',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* ── Step content — always readable through overlay ── */}
      <div style={{ padding: '14px 16px 14px', position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

          {/* Step number bubble */}
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${topicColor}22`, border: `1px solid ${topicColor}50`,
            fontSize: 11, fontWeight: 800, color: topicColor,
          }}>
            {stepNum}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 5 }}>
              {step.title}
            </div>
            <div style={{
              fontSize: 13, color: 'rgba(180,220,255,0.75)',
              fontFamily: '"Courier New", monospace', letterSpacing: '-0.2px',
            }}>
              {step.detail}
            </div>

            {/* Result badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
              padding: '3px 10px', borderRadius: 8,
              background: `${topicColor}18`, border: `1px solid ${topicColor}35`,
            }}>
              <span style={{ fontSize: 11, color: 'rgba(140,200,255,0.45)' }}>→</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: topicColor, fontFamily: '"Courier New", monospace' }}>
                {step.result}
              </span>
            </div>

            {step.tip && (
              <div style={{
                marginTop: 8, fontSize: 11, color: 'rgba(0,180,255,0.55)',
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(0,100,255,0.07)',
                border: '1px solid rgba(0,150,255,0.12)',
              }}>
                💡 {step.tip}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Horizontal strength fill (left → right) ── */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: `${value}%`,
        background: `${barColor}18`,
        zIndex: 2,
        pointerEvents: 'none',
        transition: 'background 0.3s',
      }} />

      {/* ── Vertical drag line at fill boundary ── */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0,
        left: `${value}%`,
        width: 2,
        background: `linear-gradient(180deg, transparent 0%, ${barColor}90 20%, ${barColor} 50%, ${barColor}90 80%, transparent 100%)`,
        boxShadow: `0 0 10px ${barColor}60`,
        zIndex: 3,
        pointerEvents: 'none',
        transition: 'background 0.3s, box-shadow 0.3s',
        transform: 'translateX(-1px)',
      }} />

      {/* ── Strength pill — rides on the handle ── */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: `${value}%`,
        transform: 'translate(-50%, -50%)',
        padding: '2px 7px',
        borderRadius: 20,
        background: barColor,
        color: '#020a14',
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 0.4,
        zIndex: 4,
        pointerEvents: 'none',
        boxShadow: `0 0 10px ${barColor}70`,
        transition: 'background 0.3s, box-shadow 0.3s',
        whiteSpace: 'nowrap',
      }}>
        {value}%
      </div>
    </div>
  )
}

export default function AnalysisScreen({ questions, answers, topicName, topicIcon, topicColor, onBack }: Props) {
  const [conf, setConf] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    questions.forEach((q, qi) => q.steps.forEach((_, si) => { init[`${qi}-${si}`] = 100 }))
    return init
  })

  const onChange = useCallback((key: string, v: number) => {
    setConf(c => ({ ...c, [key]: v }))
  }, [])

  const allVals = Object.values(conf)
  const overallConf = Math.round(allVals.reduce((a, b) => a + b, 0) / Math.max(1, allVals.length))
  const overallColor = overallConf >= 75 ? '#06d6a0' : overallConf >= 50 ? '#f59e0b' : '#ff3d6b'

  return (
    <div className="content-scroll">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'rgba(0,190,255,0.55)', fontSize: 13, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c4b5fd')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,190,255,0.55)')}
        >
          ← Results
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e8f4ff' }}>
            {topicIcon} Step-by-Step Analysis
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,190,255,0.55)', marginTop: 2 }}>
            {topicName} · drag each step left/right to set your strength
          </div>
        </div>

        {/* Overall strength badge */}
        <div style={{
          padding: '8px 14px', borderRadius: 12, flexShrink: 0, textAlign: 'center',
          background: `${overallColor}12`, border: `1px solid ${overallColor}35`,
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: overallColor }}>{overallConf}%</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(140,200,255,0.45)' }}>
            strength
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        fontSize: 11, color: 'rgba(0,180,255,0.4)', marginBottom: 22,
        display: 'flex', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#06d6a0' }}>● ≥ 75% strong</span>
        <span style={{ color: '#f59e0b' }}>● 50–74% developing</span>
        <span style={{ color: '#ff3d6b' }}>● &lt; 50% needs work</span>
      </div>

      {/* ── Questions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {questions.map((q, qi) => {
          const userAns   = answers[qi]
          const isRight   = userAns !== null && userAns === q.answer
          const isSkip    = userAns === null
          const resColor  = isRight ? '#06d6a0' : isSkip ? '#60d4ff' : '#ff3d6b'
          const resIcon   = isRight ? '✓' : isSkip ? '–' : '✗'

          return (
            <div key={qi} className="glass" style={{ padding: '20px 22px' }}>

              {/* Question row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${resColor}18`, border: `1px solid ${resColor}40`,
                  fontSize: 13, fontWeight: 800, color: resColor,
                }}>
                  {resIcon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    textTransform: 'uppercase', color: 'rgba(140,200,255,0.45)', marginBottom: 4,
                  }}>
                    Q{qi + 1} · {q.strategy}
                  </div>
                  <div style={{
                    fontSize: 22, fontWeight: 900, color: '#e8f4ff',
                    letterSpacing: '-0.4px', lineHeight: 1.25,
                  }}>
                    {q.prompt}
                  </div>
                  {!isRight && (
                    <div style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {isSkip
                        ? <span style={{ color: '#60d4ff' }}>Time out</span>
                        : <span style={{ color: '#ff3d6b' }}>Your answer: {userAns}</span>
                      }
                      <span style={{ color: '#06d6a0' }}>Correct: {q.answer}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step boxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.steps.map((step, si) => (
                  <StepBox
                    key={si}
                    step={step}
                    stepNum={si + 1}
                    topicColor={topicColor}
                    confKey={`${qi}-${si}`}
                    value={conf[`${qi}-${si}`] ?? 100}
                    onChange={onChange}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Overall strength bar ── */}
      <div className="glass" style={{ marginTop: 24, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f4ff', marginBottom: 7 }}>
            Overall Strength
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${overallConf}%`, borderRadius: 4,
              background: `linear-gradient(90deg, ${overallColor}bb, ${overallColor})`,
              boxShadow: `0 0 10px ${overallColor}60`,
              transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: overallColor, flexShrink: 0 }}>
          {overallConf}%
        </div>
      </div>

      <div style={{ height: 48 }} />
    </div>
  )
}
