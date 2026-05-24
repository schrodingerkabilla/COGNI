const API     = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

function headers() {
  return {
    'Content-Type':  'application/json',
    'X-API-Key':     API_KEY,
    'Authorization': `Bearer ${localStorage.getItem('cogni_token') ?? ''}`,
  }
}

async function post(path: string, body: unknown) {
  const res = await fetch(API + path, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function get(path: string) {
  const res = await fetch(API + path, { headers: headers() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Topics ──────────────────────────────────────────────────
export const getMyTopics   = () => get('/topics/me')
export const getAdminStats      = () => get('/admin/stats')
export const getDatalakeUsers   = () => get('/admin/datalake')
export const getDatalakeUser    = (user_id: number) => get(`/admin/datalake/${user_id}`)
export const runAnalytics  = () => post('/analytics/run', {})
export const getMyAnalytics= () => get('/analytics/me')
export const getMyTensor   = () => get('/analytics/me/tensor')

export const saveOnboarding = (topics: { topic_id: string; initial_confidence: number }[]) =>
  post('/topics/onboarding', { topics })

// ── Sessions ────────────────────────────────────────────────
export const startSession = (topic_id: string) =>
  post('/sessions/start', { topic_id })

export const getNextQuestion = (session_id: number) =>
  get(`/sessions/${session_id}/next`)

export const logAttempt = (session_id: number, data: {
  question_prompt: string
  correct_answer: number
  selected_answer: number | null
  is_correct: boolean
  pattern_id: string
  strategy: string
  time_to_answer_ms: number
  time_to_first_interaction_ms: number
  time_before_first_hover_ms: number
  time_from_last_switch_to_submit_ms: number
}) => post(`/sessions/${session_id}/attempt`, data)

export const endSession = (session_id: number, data: {
  ended_at: string
  total_questions: number
  correct_count: number
  accuracy: number
  xp_gained: number
  time_spent_on_analysis_ms: number
  steps_reviewed: number
}) => post(`/sessions/${session_id}/end`, data)

// ── Events ──────────────────────────────────────────────────
export const logHover = (data: {
  attempt_id: number
  option_value: number
  hover_start_ms: number
  hover_end_ms: number
  hover_duration_ms: number
  sequence_index: number
  was_final_selection: boolean
}) => post('/events/hover', data)

export const logSwitch = (data: {
  attempt_id: number
  from_option: number
  to_option: number
  timestamp_ms: number
  switch_number: number
  time_since_last_switch_ms: number
  time_since_question_shown_ms: number
}) => post('/events/switch', data)

export const logStrength = (data: {
  attempt_id: number
  step_index: number
  old_value: number
  new_value: number
  timestamp_ms: number
  drag_count: number
  time_to_first_drag_ms: number
  time_between_drags_ms: number
  total_time_on_step_ms: number
}) => post('/events/strength', data)

export const logReview = (data: {
  attempt_id: number
  review_number: number
  review_start_ms: number
  review_end_ms: number
  review_duration_ms: number
  option_hovered_during_review: boolean
  changed_answer_after_review: boolean
  answer_before_review: number | null
  answer_after_review: number | null
}) => post('/events/review', data)

export const logFocusHint = (data: {
  attempt_id: number
  hint_type: string
  pattern_id: string | null
  strategy: string | null
  time_before_answering_ms: number
}) => post('/events/focus-hint', data)

export const logTabVisibility = (data: {
  session_id:      number | null
  attempt_id:      number | null
  hidden_at_ms:    number
  visible_at_ms:   number
  duration_ms:     number
  was_mid_question: boolean
  had_selection:   boolean
}) => post('/events/tab-visibility', data)

// Fire-and-forget wrapper — never blocks the UI
export function fire(p: Promise<unknown>) {
  p.catch(err => console.warn('[api]', err))
}
