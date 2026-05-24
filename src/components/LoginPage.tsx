import { useState } from 'react'
import type { Screen } from '../types'

interface Props {
  onNav: (s: Screen) => void
}

type Mode = 'login' | 'register'

export default function LoginPage({ onNav }: Props) {
  const [mode,     setMode]     = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const API     = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  const API_KEY = import.meta.env.VITE_API_KEY ?? ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please fill in both fields')
      return
    }
    setLoading(true)
    setError('')

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login'
      const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ username, email: username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.detail ?? 'Something went wrong')
        return
      }

      localStorage.setItem('cogni_token',   data.token)
      localStorage.setItem('cogni_user_id', String(data.user_id))
      onNav('dashboard')
    } catch {
      setError('Cannot reach server — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#03080f', padding: 24,
    }}>
      {/* Aurora orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'rgba(0,120,255,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'rgba(0,180,255,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 38, fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 0%, #60d4ff 45%, #0088ff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>COGNI</div>
          <div style={{ fontSize: 13, color: 'rgba(0,190,255,0.5)', marginTop: 4, letterSpacing: 1 }}>
            Mental Math Trainer
          </div>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: '36px 32px' }}>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: 'rgba(0,100,255,0.08)',
            borderRadius: 10, padding: 4, marginBottom: 28,
          }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.18s',
                  background: mode === m ? 'rgba(0,150,255,0.25)' : 'transparent',
                  color: mode === m ? '#60d4ff' : 'rgba(140,200,255,0.4)',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,190,255,0.6)', marginBottom: 6, letterSpacing: 0.8 }}>
                USERNAME
              </div>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'rgba(0,100,255,0.07)', border: '1px solid rgba(0,150,255,0.25)',
                  color: '#e8f4ff', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,200,255,0.6)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(0,150,255,0.25)')}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,190,255,0.6)', marginBottom: 6, letterSpacing: 0.8 }}>
                PASSWORD
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'rgba(0,100,255,0.07)', border: '1px solid rgba(0,150,255,0.25)',
                  color: '#e8f4ff', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,200,255,0.6)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(0,150,255,0.25)')}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,61,107,0.1)', border: '1px solid rgba(255,61,107,0.3)',
                fontSize: 12, color: '#ff3d6b',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
