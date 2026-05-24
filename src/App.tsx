import { useState } from 'react'
import './App.css'
import type { AppState, Screen } from './types'
import { INITIAL_STATE } from './data'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import KnowledgeGraph from './components/KnowledgeGraph'
import TopicDetail from './components/TopicDetail'
import PracticeSession from './components/PracticeSession'
import QuickQuiz from './components/QuickQuiz'
import LoginPage from './components/LoginPage'
import OnboardingPage from './components/OnboardingPage'
import * as api from './api'

const NAV = [
  { id: 'dashboard' as Screen, label: 'Dashboard', icon: '⊞' },
  { id: 'graph'     as Screen, label: 'Map',        icon: '◎' },
  { id: 'quiz'      as Screen, label: 'Quick Quiz', icon: '⚡' },
]

function initialScreen(): Screen {
  return localStorage.getItem('cogni_token') ? 'dashboard' : 'login'
}

export default function App() {
  const [state, setState] = useState<AppState>({ ...INITIAL_STATE, screen: initialScreen() })

  function nav(screen: Screen, topicId?: string) {
    setState(s => ({ ...s, screen, activeTopicId: topicId ?? s.activeTopicId }))
  }

  function openTopic(id: string) {
    setState(s => ({ ...s, screen: 'topic', activeTopicId: id }))
  }

  function logout() {
    localStorage.removeItem('cogni_token')
    localStorage.removeItem('cogni_user_id')
    setState(s => ({ ...s, screen: 'login' }))
  }

  async function afterLogin() {
    try {
      const topics = await api.getMyTopics()
      setState(s => ({ ...s, screen: Array.isArray(topics) && topics.length === 0 ? 'onboarding' : 'dashboard' }))
    } catch {
      setState(s => ({ ...s, screen: 'dashboard' }))
    }
  }

  if (state.screen === 'login') {
    return <LoginPage onLoginSuccess={afterLogin} />
  }

  if (state.screen === 'onboarding') {
    return <OnboardingPage onDone={() => nav('dashboard')} />
  }

  return (
    <div className="app-layout">
      <Sidebar screen={state.screen} onNav={nav} onLogout={logout} />

      <main className="app-main">
        <div key={state.screen + (state.activeTopicId ?? '')} className="screen-enter">
          {state.screen === 'dashboard' && (
            <Dashboard state={state} onTopicClick={openTopic} />
          )}
          {state.screen === 'graph' && (
            <KnowledgeGraph onTopicClick={openTopic} />
          )}
          {state.screen === 'topic' && state.activeTopicId && (
            <TopicDetail topicId={state.activeTopicId} onNav={nav} />
          )}
          {state.screen === 'practice' && state.activeTopicId && (
            <PracticeSession topicId={state.activeTopicId} onNav={nav} />
          )}
          {state.screen === 'quiz' && (
            <QuickQuiz onNav={nav} />
          )}
        </div>
      </main>

      <nav className="bottom-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`bottom-nav-btn ${state.screen === item.id || (state.screen === 'topic' && item.id === 'graph') ? 'active' : ''}`}
            onClick={() => nav(item.id)}
          >
            <span className="bn-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
