import { useState, useCallback, useRef, useEffect } from 'react'
import { TOPICS } from '../data'
import type { Question, SolutionStep } from '../utils/questionGen'
import type { Screen } from '../types'
import * as api from '../api'

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
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: `${value}%`, background: `${barColor}18`,
        zIndex: 2, pointerEvents: 'none', transition: 'background 0.3s',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${value}%`, width: 2,
        background: `linear-gradient(180deg, transparent 0%, ${barColor}90 20%, ${barColor} 50%, ${barColor}90 80%, transparent 100%)`,
        boxShadow: `0 0 10px ${barColor}60`,
        zIndex: 3, pointerEvents: 'none', transform: 'translateX(-1px)',
      }} />
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
  // ─── State / refs ─────────────────────────────────────────
  const [current,   setCurrent]  = useState<QWithTopic | null>(null)
  const [selected,  setSel]      = useState<number | null>(null)
  const [confirmed, setConfirmed]= useState<number | null>(null)
  const [correct,   setCorrect]  = useState(0)
  const [total,     setTotal]    = useState(0)
  const [conf,      setConf]     = useState<Record<string, number>>({})
  const [reviewOpen, setReviewOpen] = useState(false)

  const sessionId    = useRef<number | null>(null)
  const attemptId    = useRef<number | null>(null)
  const qStartMs     = useRef(Date.now())
  const firstInter   = useRef<number | null>(null)
  const hoverStart   = useRef<{ option: number; ms: number } | null>(null)
  const hoverSeq     = useRef(0)
  const switchCount  = useRef(0)
  const lastSwitchMs = useRef<number | null>(null)
  const tabHideMs    = useRef<number | null>(null)
  const reviewCount      = useRef(0)
  const reviewStartMs    = useRef<number | null>(null)
  const reviewSelAtStart = useRef<number | null>(null)
  const pendingHovers    = useRef<Omit<Parameters<typeof api.logHover>[0],'attempt_id'>[]>([])
  const pendingSwitches  = useRef<Omit<Parameters<typeof api.logSwitch>[0],'attempt_id'>[]>([])
  const pendingReviews   = useRef<Omit<Parameters<typeof api.logReview>[0],'attempt_id'>[]>([])

  // ─── Null-safe derived values (used by hooks) ─────────────
  const q        = current?.q ?? null
  const revealed = confirmed !== null
  const isRight  = q != null && confirmed === q.answer

  // ─── Session init — start session and fetch first question ─
  useEffect(() => {
    async function init() {
      try {
        const sd = await api.startSession('mixed')
        sessionId.current = sd.session_id
        const qd = await api.getNextQuestion(sd.session_id)
        const topic = TOPICS.find(t => t.id === qd.topic_id) ?? TOPICS[0]
        setCurrent({ q: qd.question, topicId: topic.id, topicColor: topic.color, topicIcon: topic.icon, topicName: topic.name })
      } catch (e) { console.warn(e) }
    }
    init()
  }, [])

  // ─── Select ───────────────────────────────────────────────
  const select = useCallback((choice: number) => {
    if (revealed) return
    const now = Date.now()
    if (!firstInter.current) firstInter.current = now

    if (hoverStart.current) {
      const startMs  = hoverStart.current.ms
      const relStart = startMs - qStartMs.current
      const duration = now - startMs
      pendingHovers.current.push({
        option_value:        hoverStart.current.option,
        hover_start_ms:      relStart,
        hover_end_ms:        relStart + duration,
        hover_duration_ms:   duration,
        sequence_index:      ++hoverSeq.current,
        was_final_selection: choice === hoverStart.current.option,
      })
      hoverStart.current = null
    }

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
  }, [revealed, selected])

  // ─── Confirm ─────────────────────────────────────────────
  const confirm = useCallback(() => {
    if (!selected || revealed || !q) return
    const now     = Date.now()
    const elapsed = now - qStartMs.current

    setConfirmed(selected)
    setTotal(t => t + 1)
    setCorrect(c => c + (selected === q.answer ? 1 : 0))
    const init: Record<string, number> = {}
    q.steps.forEach((_, i) => { init[String(i)] = 100 })
    setConf(init)

    if (sessionId.current) {
      api.logAttempt(sessionId.current, {
        question_prompt:                    q.prompt,
        correct_answer:                     q.answer,
        selected_answer:                    selected,
        is_correct:                         selected === q.answer,
        pattern_id:                         q.patternId,
        strategy:                           q.strategy,
        time_to_answer_ms:                  elapsed,
        time_to_first_interaction_ms:       firstInter.current ? firstInter.current - qStartMs.current : elapsed,
        time_before_first_hover_ms:         firstInter.current ? firstInter.current - qStartMs.current : elapsed,
        time_from_last_switch_to_submit_ms: lastSwitchMs.current ? now - lastSwitchMs.current : 0,
      })
        .then(d => {
          attemptId.current = d.attempt_id
          pendingHovers.current.forEach(e   => api.fire(api.logHover({   ...e, attempt_id: d.attempt_id })))
          pendingSwitches.current.forEach(e => api.fire(api.logSwitch({  ...e, attempt_id: d.attempt_id })))
          pendingReviews.current.forEach(e  => api.fire(api.logReview({  ...e, attempt_id: d.attempt_id })))
          pendingHovers.current   = []
          pendingSwitches.current = []
          pendingReviews.current  = []
          api.fire(api.runAnalytics())
        })
        .catch(console.warn)
    }
  }, [selected, revealed, q])

  // ─── Next question ────────────────────────────────────────
  const next = useCallback(async () => {
    setCurrent(null)
    setSel(null)
    setConfirmed(null)
    setConf({})
    qStartMs.current       = Date.now()
    firstInter.current     = null
    hoverStart.current     = null
    hoverSeq.current       = 0
    switchCount.current    = 0
    lastSwitchMs.current   = null
    attemptId.current      = null
    reviewCount.current    = 0
    reviewStartMs.current  = null
    pendingHovers.current  = []
    pendingSwitches.current= []
    pendingReviews.current = []
    if (sessionId.current) {
      try {
        const qd = await api.getNextQuestion(sessionId.current)
        const topic = TOPICS.find(t => t.id === qd.topic_id) ?? TOPICS[0]
        setCurrent({ q: qd.question, topicId: topic.id, topicColor: topic.color, topicIcon: topic.icon, topicName: topic.name })
      } catch (e) { console.warn(e) }
    }
  }, [])

  // ─── Step confidence ──────────────────────────────────────
  const setStepConf = useCallback((id: string, v: number) => {
    setConf(c => ({ ...c, [id]: v }))
    if (attemptId.current) {
      api.fire(api.logStrength({
        attempt_id:            attemptId.current,
        step_index:            Number(id),
        old_value:             conf[id] ?? 100,
        new_value:             v,
        timestamp_ms:          Date.now() - qStartMs.current,
        drag_count:            1,
        time_to_first_drag_ms: 0,
        time_between_drags_ms: 0,
        total_time_on_step_ms: 0,
      }))
    }
  }, [conf])

  // ─── Hover tracking ───────────────────────────────────────
  const onHoverEnter = useCallback((choice: number) => {
    if (revealed) return
    const now = Date.now()
    if (!firstInter.current) firstInter.current = now
    hoverStart.current = { option: choice, ms: now }
  }, [revealed])

  const onHoverLeave = useCallback((choice: number) => {
    if (revealed || !hoverStart.current || hoverStart.current.option !== choice) return
    const now      = Date.now()
    const startMs  = hoverStart.current.ms
    const relStart = startMs - qStartMs.current
    const duration = now - startMs
    hoverStart.current = null
    pendingHovers.current.push({
      option_value:        choice,
      hover_start_ms:      relStart,
      hover_end_ms:        relStart + duration,
      hover_duration_ms:   duration,
      sequence_index:      ++hoverSeq.current,
      was_final_selection: false,
    })
  }, [revealed])

  // ─── Tab visibility ───────────────────────────────────────
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
            was_mid_question: !revealed,
            had_selection:   selected !== null,
          }))
        }
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => document.removeEventListener('visibilitychange', onVisChange)
  }, [revealed, selected])

  // ─── Review helpers ───────────────────────────────────────
  function openReview() {
    if (selected === null || revealed) return
    reviewStartMs.current    = Date.now()
    reviewSelAtStart.current = selected
    setReviewOpen(true)
  }

  function closeReview() {
    if (reviewStartMs.current === null) { setReviewOpen(false); return }
    const now      = Date.now()
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

  // ─── Computed ────────────────────────────────────────────
  const acc = total === 0 ? 100 : Math.round((correct / total) * 100)
  const accColor = acc >= 75 ? '#06d6a0' : acc >= 50 ? '#f59e0b' : '#ff3d6b'

  // ─── Loading guard (all hooks are above this line) ────────
  if (!current) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(140,200,255,0.45)', fontSize: 14 }}>
      Loading question…
    </div>
  )

  // current is non-null from here on
  const { q: cq, topicColor, topicIcon, topicName } = current

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
          {cq.prompt}
        </div>
      </div>

      {/* Choices 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 560, marginBottom: 12 }}>
        {cq.choices.map(choice => {
          const isSel = selected === choice
          const isAns = choice === cq.answer

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
          } else if (isSel) {
            bg = 'rgba(0,150,255,0.18)'; border = '#00c8ff'; color = '#e8f4ff'
            shadow = '0 0 18px rgba(0,200,255,0.25)'
          }

          return (
            <button
              key={choice}
              onClick={() => select(choice)}
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
                if (!revealed && !isSel) {
                  e.currentTarget.style.background = 'rgba(0,150,255,0.12)'
                  e.currentTarget.style.borderColor = 'rgba(0,200,255,0.35)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  onHoverEnter(choice)
                }
              }}
              onMouseLeave={e => {
                if (!revealed && !isSel) {
                  e.currentTarget.style.background = 'rgba(0,100,255,0.07)'
                  e.currentTarget.style.borderColor = 'rgba(0,150,255,0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
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
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 560, marginBottom: 16 }}>
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
            onClick={confirm}
            style={{ flex: 1, justifyContent: 'center', fontSize: 15 }}
          >
            Confirm Answer →
          </button>
        </div>
      )}
      {!revealed && selected === null && (
        <div style={{ height: 16, marginBottom: 16 }} />
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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: topicColor, opacity: 0.7, marginBottom: 20 }}>
              {topicIcon} {topicName} · Re-read
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#e8f4ff', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 32 }}>
              {cq.prompt}
            </div>
            <button onClick={closeReview} className="btn-primary" style={{ justifyContent: 'center', fontSize: 14 }}>
              Back to Answering →
            </button>
          </div>
        </div>
      )}

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
                {isRight ? 'Correct!' : `Answer: ${cq.answer}`}
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
              {cq.strategy}
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
              {cq.steps.map((step, i) => (
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
