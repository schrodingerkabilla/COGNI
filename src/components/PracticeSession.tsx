import { useState, useEffect, useCallback, useRef } from 'react'
import { TOPICS } from '../data'
import type { Question } from '../utils/questionGen'
import type { Screen } from '../types'
import AnalysisScreen from './AnalysisScreen'
import * as api from '../api'

interface Props {
  topicId: string
  onNav: (s: Screen) => void
}

const TOTAL_Q     = 10
const TIMER_SEC   = 15
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

type PendingHover  = Omit<Parameters<typeof api.logHover>[0],       'attempt_id'>
type PendingSwitch = Omit<Parameters<typeof api.logSwitch>[0],      'attempt_id'>
type PendingHint   = Omit<Parameters<typeof api.logFocusHint>[0],   'attempt_id'>
type PendingReview = Omit<Parameters<typeof api.logReview>[0],      'attempt_id'>

export default function PracticeSession({ topicId, onNav }: Props) {
  const topic = TOPICS.find(t => t.id === topicId)

  const [questions,  setQuestions]  = useState<Question[]>([])
  const [qIdx,       setQIdx]       = useState(0)
  const [phase,      setPhase]      = useState<'q' | 'fb' | 'done' | 'analysis'>('q')
  const [selected,   setSel]        = useState<number | null>(null)  // highlighted pick
  const [confirmed,  setConfirmed]  = useState<number | null>(null)  // locked answer
  const [timer,      setTimer]      = useState(TIMER_SEC)
  const [score,      setScore]      = useState(0)
  const [totalXp,    setXp]         = useState(0)
  const [patErr,     setPatErr]     = useState<Record<string, number>>({})
  const [times,      setTimes]      = useState<number[]>([])
  const [answers,    setAnswers]    = useState<(number | null)[]>([])
  const [attemptIds, setAttemptIds] = useState<number[]>([])

  // ── Tracking refs ─────────────────────────────────────────
  const sessionId          = useRef<number | null>(null)
  const attemptId          = useRef<number | null>(null)
  const qStartMs           = useRef(Date.now())
  const firstInteractionMs = useRef<number | null>(null)
  const firstHoverMs       = useRef<number | null>(null)
  const lastSwitchMs       = useRef<number | null>(null)
  const switchCount        = useRef(0)
  const hoverSeq           = useRef(0)
  const hoverStart         = useRef<{ option: number; ms: number } | null>(null)
  const analysisStartMs    = useRef<number>(0)

  // ── Event buffers ─────────────────────────────────────────
  const pendingHovers   = useRef<PendingHover[]>([])
  const pendingSwitches = useRef<PendingSwitch[]>([])
  const pendingHints    = useRef<PendingHint[]>([])
  const pendingReviews  = useRef<PendingReview[]>([])

  // ── Review state ──────────────────────────────────────────
  const [reviewOpen,    setReviewOpen]    = useState(false)
  const reviewCount     = useRef(0)
  const reviewStartMs   = useRef<number | null>(null)
  const reviewSelAtStart= useRef<number | null>(null)

  // ── Tab visibility ────────────────────────────────────────
  const tabHideMs = useRef<number | null>(null)

  const busy   = useRef(false)
  const q      = questions[qIdx]
  const animXp = useCountUp(totalXp, phase === 'done')


  function resetQTracking() {
    qStartMs.current           = Date.now()
    firstInteractionMs.current = null
    firstHoverMs.current       = null
    lastSwitchMs.current       = null
    switchCount.current        = 0
    hoverSeq.current           = 0
    hoverStart.current         = null
    reviewCount.current        = 0
    reviewStartMs.current      = null
    reviewSelAtStart.current   = null
    pendingHovers.current      = []
    pendingSwitches.current    = []
    pendingHints.current       = []
    pendingReviews.current     = []
  }

  // Start backend session on mount and fetch first question
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const sd = await api.retrying(() => api.startSession(topicId))
        if (cancelled) return
        sessionId.current = sd.session_id
        const qd = await api.getNextQuestion(sd.session_id)
        if (cancelled) return
        setQuestions([qd.question])
      } catch (e) { console.warn(e) }
    }
    init()
    return () => { cancelled = true }
  }, [topicId])

  // Reset tracking on each new question
  useEffect(() => { resetQTracking() }, [qIdx])

  // Buffer focus hint when question appears
  useEffect(() => {
    if (phase !== 'q' || !q) return
    const weak = topic?.weakPatterns.find(p => p.id === q.patternId)
    pendingHints.current.push({
      hint_type:                weak ? 'weak_area' : 'focus_point',
      pattern_id:               weak?.id ?? null,
      strategy:                 weak ? null : q.strategy ?? null,
      time_before_answering_ms: 0,
    })
  }, [qIdx, phase, q])

  // ── Tab visibility ────────────────────────────────────────
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        tabHideMs.current = Date.now()
      } else if (tabHideMs.current !== null) {
        const now         = Date.now()
        const duration    = now - tabHideMs.current
        const hiddenAt    = tabHideMs.current - qStartMs.current
        const visibleAt   = now - qStartMs.current
        tabHideMs.current = null
        if (sessionId.current) {
          api.fire(api.logTabVisibility({
            session_id:      sessionId.current,
            attempt_id:      null,
            hidden_at_ms:    hiddenAt,
            visible_at_ms:   visibleAt,
            duration_ms:     duration,
            was_mid_question: phase === 'q',
            had_selection:   selected !== null,
          }))
        }
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => document.removeEventListener('visibilitychange', onVisChange)
  }, [phase, selected])

  // ── Review helpers ────────────────────────────────────────
  function openReview() {
    if (selected === null || revealed) return
    reviewStartMs.current    = Date.now()
    reviewSelAtStart.current = selected
    setReviewOpen(true)
  }

  function closeReview() {
    if (reviewStartMs.current === null) { setReviewOpen(false); return }
    const now     = Date.now()
    const startRel = reviewStartMs.current - qStartMs.current
    const endRel   = now - qStartMs.current
    pendingReviews.current.push({
      review_number:               ++reviewCount.current,
      review_start_ms:             startRel,
      review_end_ms:               endRel,
      review_duration_ms:          endRel - startRel,
      option_hovered_during_review: false,
      changed_answer_after_review: selected !== reviewSelAtStart.current,
      answer_before_review:        reviewSelAtStart.current,
      answer_after_review:         selected,
    })
    reviewStartMs.current = null
    setReviewOpen(false)
  }

  // ── Hover tracking ────────────────────────────────────────
  const onHoverEnter = useCallback((choice: number) => {
    if (phase !== 'q') return
    const now = Date.now()
    if (!firstInteractionMs.current) firstInteractionMs.current = now
    if (!firstHoverMs.current)       firstHoverMs.current       = now
    hoverStart.current = { option: choice, ms: now }
  }, [phase])

  const onHoverLeave = useCallback((choice: number) => {
    if (phase !== 'q' || !hoverStart.current || hoverStart.current.option !== choice) return
    const now = Date.now()
    const rel = hoverStart.current.ms - qStartMs.current
    const dur = now - hoverStart.current.ms
    hoverStart.current = null
    pendingHovers.current.push({
      option_value:        choice,
      hover_start_ms:      rel,
      hover_end_ms:        rel + dur,
      hover_duration_ms:   dur,
      sequence_index:      ++hoverSeq.current,
      was_final_selection: false,
    })
  }, [phase])

  // ── Select (1st click — no reveal) ───────────────────────
  const select = useCallback((choice: number) => {
    if (phase !== 'q') return
    const now = Date.now()
    if (!firstInteractionMs.current) firstInteractionMs.current = now

    // close open hover
    if (hoverStart.current) {
      const rel = hoverStart.current.ms - qStartMs.current
      const dur = now - hoverStart.current.ms
      pendingHovers.current.push({
        option_value:        hoverStart.current.option,
        hover_start_ms:      rel,
        hover_end_ms:        rel + dur,
        hover_duration_ms:   dur,
        sequence_index:      ++hoverSeq.current,
        was_final_selection: choice === hoverStart.current.option,
      })
      hoverStart.current = null
    }

    // track switch
    if (selected !== null && selected !== choice) {
      pendingSwitches.current.push({
        from_option:                  selected,
        to_option:                    choice,
        timestamp_ms:                 now - qStartMs.current,
        switch_number:                ++switchCount.current,
        time_since_last_switch_ms:    lastSwitchMs.current ? now - lastSwitchMs.current : 0,
        time_since_question_shown_ms: now - qStartMs.current,
      })
      lastSwitchMs.current = now
    }

    setSel(choice)
  }, [phase, selected])

  // ── Confirm (final submit — triggers reveal) ─────────────
  const confirm = useCallback((forceChoice?: number | null) => {
    if (phase !== 'q' || busy.current || !q) return
    busy.current = true

    const choice  = forceChoice !== undefined ? forceChoice : selected
    const now     = Date.now()
    const elapsed = now - qStartMs.current
    const isRight = choice !== null && choice === q.answer

    if (pendingHints.current.length > 0)
      pendingHints.current[pendingHints.current.length - 1].time_before_answering_ms = elapsed

    setSel(choice)
    setConfirmed(choice)
    setPhase('fb')
    setScore(s => s + (isRight ? 1 : 0))
    setXp(x => x + (isRight ? XP_CORRECT : 0))
    setTimes(t => [...t, elapsed / 1000])
    setAnswers(a => [...a, choice])
    if (!isRight && choice !== null) setPatErr(e => ({ ...e, [q.patternId]: (e[q.patternId] || 0) + 1 }))

    if (sessionId.current) {
      const hovers   = [...pendingHovers.current]
      const switches = [...pendingSwitches.current]
      const reviews  = [...pendingReviews.current]
      const hints    = [...pendingHints.current]
      pendingHovers.current   = []
      pendingSwitches.current = []
      pendingReviews.current  = []
      pendingHints.current    = []

      api.retrying(() => api.logAttemptFull(sessionId.current!, {
        attempt: {
          question_prompt:                    q.prompt,
          correct_answer:                     q.answer,
          selected_answer:                    choice,
          is_correct:                         isRight,
          pattern_id:                         q.patternId,
          strategy:                           q.strategy,
          time_to_answer_ms:                  elapsed,
          time_to_first_interaction_ms:       firstInteractionMs.current ? firstInteractionMs.current - qStartMs.current : elapsed,
          time_before_first_hover_ms:         firstHoverMs.current       ? firstHoverMs.current - qStartMs.current       : elapsed,
          time_from_last_switch_to_submit_ms: lastSwitchMs.current       ? now - lastSwitchMs.current                    : 0,
        },
        hovers, switches, reviews, hints,
      }))
        .then(d => {
          attemptId.current = d.attempt_id
          setAttemptIds(ids => [...ids, d.attempt_id])
        })
        .catch(console.warn)
    }

    const nextIdx = qIdx + 1

    // Fetch next question during the feedback window
    if (nextIdx < TOTAL_Q && sessionId.current) {
      const sid = sessionId.current
      api.getNextQuestion(sid)
        .then(d => setQuestions(qs => {
          const copy = [...qs]
          copy[nextIdx] = d.question
          return copy
        }))
        .catch(console.warn)
    }

    setTimeout(() => {
      busy.current = false
      if (nextIdx >= TOTAL_Q) { setPhase('done'); return }
      setQIdx(nextIdx)
      setSel(null); setConfirmed(null); setTimer(TIMER_SEC)
      setPhase('q')
    }, FEEDBACK_MS)
  }, [phase, selected, q, qIdx])

  // countdown — auto-confirm on 0, paused while question is loading
  useEffect(() => {
    if (phase !== 'q' || !q) return
    if (timer <= 0) { confirm(selected ?? null); return }
    const id = setTimeout(() => setTimer(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timer, phase, confirm, selected, q])

  const resetSession = useCallback(() => {
    setQuestions([])
    setQIdx(0); setSel(null); setConfirmed(null)
    setScore(0); setXp(0); setPatErr({}); setTimes([]); setAnswers([]); setAttemptIds([])
    setTimer(TIMER_SEC)
    busy.current = false; sessionId.current = null; attemptId.current = null
    analysisStartMs.current = 0
    resetQTracking()
    setPhase('q')
    ;(async () => {
      try {
        const sd = await api.retrying(() => api.startSession(topicId))
        sessionId.current = sd.session_id
        const qd = await api.getNextQuestion(sd.session_id)
        setQuestions([qd.question])
      } catch (e) { console.warn(e) }
    })()
  }, [topicId])

  if (!topic) return null
  if (!q) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(140,200,255,0.45)', fontSize: 14 }}>
      Loading question…
    </div>
  )

  const revealed  = confirmed !== null
  const isCorrect = confirmed === q.answer

  /* ── ANALYSIS ────────────────────────────────────── */
  if (phase === 'analysis') {
    return (
      <AnalysisScreen
        questions={questions} answers={answers}
        topicName={topic.name} topicIcon={topic.icon} topicColor={topic.color}
        onBack={() => setPhase('done')}
        sessionId={sessionId.current} attemptIds={attemptIds}
      />
    )
  }

  /* ── RESULTS ─────────────────────────────────────── */
  if (phase === 'done') {
    const acc       = Math.round((score / TOTAL_Q) * 100)
    const avgTime   = times.length ? (times.reduce((a, b) => a + b) / times.length).toFixed(1) : '-'
    const topErrors = Object.entries(patErr)
      .sort(([, a], [, b]) => b - a).slice(0, 3)
      .map(([id, n]) => ({ name: topic.weakPatterns.find(p => p.id === id)?.name ?? id, n }))
    const ringColor = acc >= 75 ? '#06d6a0' : acc >= 50 ? '#f59e0b' : '#ff3d6b'
    const r = 52, circ = 2 * Math.PI * r, dash = (score / TOTAL_Q) * circ
    const headline  = acc >= 80 ? 'Nailed it! 🔥' : acc >= 60 ? 'Good session ✨' : 'Keep grinding 💪'

    if (sessionId.current && analysisStartMs.current === 0) {
      analysisStartMs.current = Date.now()
      api.fire(api.endSession(sessionId.current, {
        ended_at: new Date().toISOString(), total_questions: TOTAL_Q,
        correct_count: score, accuracy: acc, xp_gained: totalXp,
        time_spent_on_analysis_ms: 0, steps_reviewed: 0,
      }))
      api.fire(api.runAnalytics())
    }

    return (
      <div className="content-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
        <div className="glass" style={{ padding: '36px 40px', maxWidth: 480, width: '100%' }}>
          <div style={{ position: 'relative', width: 128, height: 128, margin: '0 auto 24px' }}>
            <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={64} cy={64} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
              <circle cx={64} cy={64} r={r} fill="none" stroke={ringColor} strokeWidth={9}
                strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 10px ${ringColor}90)`, transition: 'stroke-dasharray 0.8s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: ringColor, lineHeight: 1 }}>{score}/{TOTAL_Q}</div>
              <div style={{ fontSize: 12, color: 'rgba(180,220,255,0.6)', fontWeight: 600, marginTop: 2 }}>{acc}%</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e8f4ff' }}>{headline}</div>
            <div style={{ fontSize: 13, color: 'rgba(0,190,255,0.55)', marginTop: 4 }}>{topic.icon} {topic.name} · avg {avgTime}s per question</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 22px', borderRadius: 24, margin: '20px auto', background: 'rgba(0,160,145,0.1)', border: '1px solid rgba(0,200,180,0.25)', width: 'fit-content' }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#2dd4bf' }}>+{animXp} XP</span>
            <span style={{ fontSize: 12, color: 'rgba(0,190,255,0.55)' }}>earned</span>
          </div>
          {topErrors.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">Patterns to work on</div>
              {topErrors.map(e => (
                <div key={e.name} style={{ fontSize: 13, color: 'rgba(180,220,255,0.65)', marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid rgba(255,100,100,0.45)', lineHeight: 1.4 }}>⚠ {e.name} — missed {e.n}×</div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Correct',  value: `${score}/${TOTAL_Q}`, color: ringColor },
              { label: 'Avg time', value: `${avgTime}s`,          color: '#2dd4bf' },
              { label: 'XP',       value: `+${totalXp}`,          color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="glass" style={{ flex: 1, padding: '12px 10px', textAlign: 'center', border: `1px solid ${s.color}25` }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(180,220,255,0.45)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10, fontSize: 15 }} onClick={() => setPhase('analysis')}>
            🔍 View Step-by-Step Analysis
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'rgba(0,100,255,0.18)', boxShadow: 'none' }} onClick={resetSession}>↺ Try Again</button>
            <button onClick={() => onNav('dashboard')} style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(0,150,255,0.3)', background: 'rgba(0,100,255,0.1)', color: '#60d4ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Dashboard →</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── QUESTION ────────────────────────────────────── */
  const timerPct   = (timer / TIMER_SEC) * 100
  const timerColor = timer > 7 ? '#0088ff' : timer > 4 ? '#f59e0b' : '#ff3d6b'

  return (
    <div className="content-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 520, marginBottom: 28, gap: 12 }}>
        <button onClick={() => onNav('topic')} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(0,180,255,0.45)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: topic.color }}>{topic.icon} {topic.name}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(180,220,255,0.6)', background: 'rgba(0,100,255,0.1)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(0,150,255,0.2)' }}>{qIdx + 1} / {TOTAL_Q}</div>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '26px 30px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${timerPct}%`, background: `linear-gradient(90deg, ${timerColor}, ${timerColor}cc)`, boxShadow: `0 0 10px ${timerColor}90`, transition: 'width 0.9s linear, background 0.4s' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: timerColor, minWidth: 28, textAlign: 'right' }}>{timer}s</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#e8f4ff', textAlign: 'center', letterSpacing: '-0.5px', lineHeight: 1.25, padding: '8px 0 4px' }}>{q.prompt}</div>
      </div>

      {/* Choices 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 520, marginBottom: 12 }}>
        {q.choices.map(choice => {
          const isSel = selected === choice
          const isAns = choice === q.answer
          let bg = 'rgba(0,100,255,0.07)', border = 'rgba(0,150,255,0.2)', color = '#e8f4ff', shadow = 'none'

          if (revealed && isAns)                     { bg = 'rgba(6,214,160,0.15)';  border = '#06d6a0'; color = '#06d6a0'; shadow = '0 0 24px rgba(6,214,160,0.35)' }
          else if (revealed && isSel && !isCorrect)  { bg = 'rgba(255,61,107,0.15)'; border = '#ff3d6b'; color = '#ff3d6b'; shadow = '0 0 24px rgba(255,61,107,0.3)' }
          else if (revealed)                         { bg = 'rgba(0,100,255,0.04)';  border = 'rgba(0,150,255,0.1)'; color = 'rgba(180,220,255,0.3)' }
          else if (isSel)                            { bg = 'rgba(0,150,255,0.18)';  border = '#00c8ff'; shadow = '0 0 18px rgba(0,200,255,0.25)' }

          return (
            <button
              key={choice}
              onClick={() => select(choice)}
              disabled={revealed}
              style={{ padding: '22px 16px', borderRadius: 14, border: `2px solid ${border}`, background: bg, color, boxShadow: shadow, fontSize: 24, fontWeight: 900, fontFamily: 'inherit', cursor: revealed ? 'default' : 'pointer', transition: 'all 0.18s ease' }}
              onMouseEnter={e => {
                if (!revealed && !isSel) {
                  e.currentTarget.style.background  = 'rgba(0,150,255,0.12)'
                  e.currentTarget.style.borderColor = 'rgba(0,200,255,0.35)'
                  e.currentTarget.style.transform   = 'translateY(-2px)'
                  onHoverEnter(choice)
                }
              }}
              onMouseLeave={e => {
                if (!revealed && !isSel) {
                  e.currentTarget.style.background  = 'rgba(0,100,255,0.07)'
                  e.currentTarget.style.borderColor = 'rgba(0,150,255,0.2)'
                  e.currentTarget.style.transform   = 'translateY(0)'
                  onHoverLeave(choice)
                }
              }}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {/* Re-read + Confirm row */}
      {!revealed && selected !== null && (
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 520, marginBottom: 12 }}>
          <button
            onClick={openReview}
            style={{
              padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(0,150,255,0.25)',
              background: 'rgba(0,100,255,0.08)', color: 'rgba(0,190,255,0.7)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,100,255,0.16)'; e.currentTarget.style.color = '#60d4ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,100,255,0.08)'; e.currentTarget.style.color = 'rgba(0,190,255,0.7)' }}
          >
            📖 Re-read
          </button>
          <button
            className="btn-primary"
            onClick={() => confirm()}
            style={{ flex: 1, justifyContent: 'center', fontSize: 15 }}
          >
            Confirm Answer →
          </button>
        </div>
      )}

      {/* Review modal */}
      {reviewOpen && (
        <div
          onClick={closeReview}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(2,10,20,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass"
            style={{ width: '100%', maxWidth: 480, padding: '36px 32px', textAlign: 'center' }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: topic.color, opacity: 0.7, marginBottom: 20 }}>
              {topic.icon} {topic.name} · Re-read
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#e8f4ff', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 32 }}>
              {q.prompt}
            </div>
            <button
              onClick={closeReview}
              className="btn-primary"
              style={{ justifyContent: 'center', fontSize: 14 }}
            >
              Back to Answering →
            </button>
          </div>
        </div>
      )}

      {phase === 'fb' && (
        <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, color: isCorrect ? '#06d6a0' : '#ff3d6b', animation: 'screenEnter 0.2s ease both' }}>
          {isCorrect ? '✓ Correct!' : `✗ Answer: ${q.answer}`}
        </div>
      )}
    </div>
  )
}
