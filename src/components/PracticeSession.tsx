import { useState, useEffect, useCallback, useRef } from 'react'
import { TOPICS } from '../data'
import { generateQuestions } from '../utils/questionGen'
import type { Screen } from '../types'
import AnalysisScreen from './AnalysisScreen'

interface Props {
  topicId: string
  onNav: (s: Screen) => void
}

const TOTAL_Q     = 10
const TIMER_SEC   = 10
const XP_CORRECT  = 15
const FEEDBACK_MS = 1100

function useCountUp(target: number, active: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    setVal(0)
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1000, 1)
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, active])
  return val
}

export default function PracticeSession({ topicId, onNav }: Props) {
  const topic = TOPICS.find(t => t.id === topicId)

  const [questions, setQuestions] = useState(() => generateQuestions(topicId, TOTAL_Q))
  const [qIdx,     setQIdx]    = useState(0)
  const [phase,    setPhase]   = useState<'q' | 'fb' | 'done' | 'analysis'>('q')
  const [selected, setSel]     = useState<number | null>(null)
  const [correct,  setCorr]    = useState<boolean | null>(null)
  const [timer,    setTimer]   = useState(TIMER_SEC)
  const [score,    setScore]   = useState(0)
  const [totalXp,  setXp]      = useState(0)
  const [patErr,   setPatErr]  = useState<Record<string, number>>({})
  const [times,    setTimes]   = useState<number[]>([])
  const [answers,  setAnswers] = useState<(number | null)[]>([])
  const tStart = useRef(Date.now())
  const busy   = useRef(false)

  const q = questions[qIdx]
  const animXp = useCountUp(totalXp, phase === 'done')

  const submit = useCallback((choice: number | null) => {
    if (phase !== 'q' || busy.current) return
    busy.current = true

    const isRight = choice !== null && choice === q.answer
    setSel(choice)
    setCorr(isRight)
    setScore(s => s + (isRight ? 1 : 0))
    setXp(x => x + (isRight ? XP_CORRECT : 0))
    setTimes(t => [...t, (Date.now() - tStart.current) / 1000])
    setAnswers(a => [...a, choice])
    if (!isRight) setPatErr(e => ({ ...e, [q.patternId]: (e[q.patternId] || 0) + 1 }))
    setPhase('fb')

    setTimeout(() => {
      busy.current = false
      const next = qIdx + 1
      if (next >= TOTAL_Q) {
        setPhase('done')
        return
      }
      setQIdx(next)
      setSel(null)
      setCorr(null)
      setTimer(TIMER_SEC)
      tStart.current = Date.now()
      setPhase('q')
    }, FEEDBACK_MS)
  }, [phase, q, qIdx])

  // countdown
  useEffect(() => {
    if (phase !== 'q') return
    if (timer <= 0) { submit(null); return }
    const id = setTimeout(() => setTimer(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timer, phase, submit])

  const resetSession = useCallback(() => {
    setQuestions(generateQuestions(topicId, TOTAL_Q))
    setQIdx(0); setSel(null); setCorr(null)
    setScore(0); setXp(0); setPatErr({}); setTimes([]); setAnswers([])
    setTimer(TIMER_SEC); tStart.current = Date.now()
    busy.current = false
    setPhase('q')
  }, [topicId])

  if (!topic || !q) return null

  /* ── ANALYSIS ────────────────────────────────────── */
  if (phase === 'analysis') {
    return (
      <AnalysisScreen
        questions={questions}
        answers={answers}
        topicName={topic.name}
        topicIcon={topic.icon}
        topicColor={topic.color}
        onBack={() => setPhase('done')}
      />
    )
  }

  /* ── RESULTS ──────────────────────────────────────── */
  if (phase === 'done') {
    const acc      = Math.round((score / TOTAL_Q) * 100)
    const avgTime  = times.length ? (times.reduce((a, b) => a + b) / times.length).toFixed(1) : '-'
    const topErrors = Object.entries(patErr)
      .sort(([, a], [, b]) => b - a).slice(0, 3)
      .map(([id, n]) => ({ name: topic.weakPatterns.find(p => p.id === id)?.name ?? id, n }))
    const ringColor = acc >= 75 ? '#06d6a0' : acc >= 50 ? '#f59e0b' : '#ff3d6b'
    const r = 52, circ = 2 * Math.PI * r, dash = (score / TOTAL_Q) * circ
    const headline = acc >= 80 ? 'Nailed it! 🔥' : acc >= 60 ? 'Good session ✨' : 'Keep grinding 💪'

    return (
      <div className="content-scroll" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40,
      }}>
        <div className="glass" style={{ padding: '36px 40px', maxWidth: 480, width: '100%' }}>

          {/* Score ring */}
          <div style={{ position: 'relative', width: 128, height: 128, margin: '0 auto 24px' }}>
            <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={64} cy={64} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
              <circle cx={64} cy={64} r={r} fill="none" stroke={ringColor} strokeWidth={9}
                strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 10px ${ringColor}90)`, transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: ringColor, lineHeight: 1 }}>{score}/{TOTAL_Q}</div>
              <div style={{ fontSize: 12, color: 'rgba(180,220,255,0.6)', fontWeight: 600, marginTop: 2 }}>{acc}%</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e8f4ff' }}>{headline}</div>
            <div style={{ fontSize: 13, color: 'rgba(0,190,255,0.55)', marginTop: 4 }}>
              {topic.icon} {topic.name} · avg {avgTime}s per question
            </div>
          </div>

          {/* XP badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 24, margin: '20px auto',
            background: 'rgba(0,160,145,0.1)', border: '1px solid rgba(0,200,180,0.25)',
            width: 'fit-content',
          }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#2dd4bf' }}>+{animXp} XP</span>
            <span style={{ fontSize: 12, color: 'rgba(0,190,255,0.55)' }}>earned</span>
          </div>

          {/* Pattern errors */}
          {topErrors.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Patterns to work on</div>
              {topErrors.map(e => (
                <div key={e.name} style={{
                  fontSize: 13, color: 'rgba(180,220,255,0.65)', marginBottom: 8,
                  paddingLeft: 10, borderLeft: '2px solid rgba(255,100,100,0.45)', lineHeight: 1.4,
                }}>⚠ {e.name} — missed {e.n}×</div>
              ))}
            </div>
          )}

          {/* Stat row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Correct',  value: `${score}/${TOTAL_Q}`, color: ringColor },
              { label: 'Avg time', value: `${avgTime}s`,          color: '#2dd4bf' },
              { label: 'XP',       value: `+${totalXp}`,          color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="glass" style={{
                flex: 1, padding: '12px 10px', textAlign: 'center',
                border: `1px solid ${s.color}25`,
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(180,220,255,0.45)', fontWeight: 600,
                  letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* View Analysis — primary CTA */}
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 10, fontSize: 15 }}
            onClick={() => setPhase('analysis')}
          >
            🔍 View Step-by-Step Analysis
          </button>

          {/* Secondary buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'rgba(0,100,255,0.18)', boxShadow: 'none' }} onClick={resetSession}>
              ↺ Try Again
            </button>
            <button
              onClick={() => onNav('dashboard')}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12,
                border: '1px solid rgba(0,150,255,0.3)', background: 'rgba(0,100,255,0.1)',
                color: '#60d4ff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Dashboard →
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── QUESTION ────────────────────────────────────── */
  const timerPct   = (timer / TIMER_SEC) * 100
  const timerColor = timer > 5 ? '#0088ff' : timer > 3 ? '#f59e0b' : '#ff3d6b'

  return (
    <div className="content-scroll" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28,
    }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        width: '100%', maxWidth: 520, marginBottom: 28, gap: 12,
      }}>
        <button
          onClick={() => onNav('topic')}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: 'rgba(0,180,255,0.45)', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >← Back</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: topic.color }}>
          {topic.icon} {topic.name}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'rgba(180,220,255,0.6)',
          background: 'rgba(0,100,255,0.1)', padding: '4px 10px', borderRadius: 20,
          border: '1px solid rgba(0,150,255,0.2)',
        }}>{qIdx + 1} / {TOTAL_Q}</div>
      </div>

      {/* Question card */}
      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '26px 30px', marginBottom: 16 }}>

        {/* Timer bar + number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${timerPct}%`,
              background: `linear-gradient(90deg, ${timerColor}, ${timerColor}cc)`,
              boxShadow: `0 0 10px ${timerColor}90`,
              transition: 'width 0.9s linear, background 0.4s',
            }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: timerColor, minWidth: 28, textAlign: 'right' }}>
            {timer}s
          </div>
        </div>

        {/* Question text */}
        <div style={{
          fontSize: 32, fontWeight: 900, color: '#e8f4ff', textAlign: 'center',
          letterSpacing: '-0.5px', lineHeight: 1.25, padding: '8px 0 4px',
        }}>
          {q.prompt}
        </div>
      </div>

      {/* Choices 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 520 }}>
        {q.choices.map(choice => {
          const isSel    = selected === choice
          const isAns    = choice === q.answer
          const inFb     = phase === 'fb'

          let bg     = 'rgba(0,100,255,0.07)'
          let border = 'rgba(0,150,255,0.2)'
          let color  = '#e8f4ff'
          let shadow = 'none'

          if (inFb && isAns) {
            bg = 'rgba(6,214,160,0.15)'; border = '#06d6a0'; color = '#06d6a0'
            shadow = `0 0 24px rgba(6,214,160,0.35)`
          } else if (inFb && isSel && !correct) {
            bg = 'rgba(255,61,107,0.15)'; border = '#ff3d6b'; color = '#ff3d6b'
            shadow = `0 0 24px rgba(255,61,107,0.3)`
          }

          return (
            <button
              key={choice}
              onClick={() => submit(choice)}
              disabled={phase === 'fb'}
              style={{
                padding: '22px 16px', borderRadius: 14,
                border: `2px solid ${border}`,
                background: bg, color, boxShadow: shadow,
                fontSize: 24, fontWeight: 900,
                fontFamily: 'inherit', cursor: phase === 'q' ? 'pointer' : 'default',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                if (phase === 'q') {
                  e.currentTarget.style.background = 'rgba(0,150,255,0.15)'
                  e.currentTarget.style.borderColor = 'rgba(0,200,255,0.45)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={e => {
                if (phase === 'q') {
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

      {/* Feedback hint */}
      {phase === 'fb' && (
        <div style={{
          marginTop: 20, fontSize: 16, fontWeight: 700,
          color: correct ? '#06d6a0' : '#ff3d6b',
          animation: 'screenEnter 0.2s ease both',
        }}>
          {correct ? '✓ Correct!' : `✗ Answer: ${q.answer}`}
        </div>
      )}
    </div>
  )
}
