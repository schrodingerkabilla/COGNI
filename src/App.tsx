import { useState, useEffect } from 'react'
import './App.css'
import type { AppState, Screen } from './types'
import { INITIAL_STATE } from './data'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import QuickQuiz from './components/QuickQuiz'
import LoginPage from './components/LoginPage'
import OnboardingPage from './components/OnboardingPage'
import * as api from './api'

function initialScreen(): Screen {
  return localStorage.getItem('cogni_token') ? 'dashboard' : 'login'
}

export default function App() {
  const [state, setState] = useState<AppState>({ ...INITIAL_STATE, screen: initialScreen() })

  useEffect(() => { api.ping() }, [])

  function nav(screen: Screen) {
    setState(s => ({ ...s, screen }))
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
        <div key={state.screen} className="screen-enter">
          {state.screen === 'dashboard' && <Dashboard state={state} />}
          {state.screen === 'quiz'      && <QuickQuiz onNav={nav} />}
        </div>
      </main>
    </div>
  )
}
