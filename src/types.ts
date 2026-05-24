export interface WeakPattern {
  id: string
  name: string
  description: string
  frequency: number // 0-100, how often this trips the student
}

export interface TopicHistory {
  date: string
  mastery: number
  sessions: number
}

export interface Topic {
  id: string
  name: string
  icon: string
  mastery: number // 0-100
  xp: number
  color: string
  x: number // graph position
  y: number
  dependencies: string[] // topic ids this depends on
  weakPatterns: WeakPattern[]
  history: TopicHistory[]
}

export type Screen = 'login' | 'dashboard' | 'graph' | 'topic' | 'practice' | 'quiz'

export interface AppState {
  screen: Screen
  activeTopicId: string | null
  streak: number
  totalXp: number
  totalSessions: number
  accuracy: number
}
