import type { Screen } from '../types'

interface Props {
  screen: Screen
  onNav: (s: Screen) => void
  onLogout: () => void
}

const NAV = [
  { id: 'dashboard' as Screen, label: 'Dashboard',   icon: '⊞' },
  { id: 'graph'     as Screen, label: 'Knowledge Map', icon: '◎' },
  { id: 'quiz'      as Screen, label: 'Quick Quiz',  icon: '⚡' },
]

export default function Sidebar({ screen, onNav, onLogout }: Props) {
  return (
    <aside className="layout-sidebar">
      <div style={{ padding: '4px 14px 24px' }}>
        <span style={{
          fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #ffffff 0%, #60d4ff 45%, #0088ff 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>COGNI</span>
        <div style={{ fontSize: 11, color: 'rgba(0,190,255,0.5)', marginTop: 3, letterSpacing: 0.8, fontWeight: 500 }}>
          Mental Math Trainer
        </div>
      </div>

      {NAV.map(item => (
        <button
          key={item.id}
          className={`nav-item ${screen === item.id ? 'active' : ''}`}
          onClick={() => onNav(item.id)}
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{
        padding: '10px 14px', borderRadius: 12,
        background: 'rgba(0,100,255,0.1)',
        border: '1px solid rgba(0,160,255,0.26)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0066ff, #00c8e8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#fff',
          flexShrink: 0, boxShadow: '0 0 16px rgba(0,150,255,0.6)',
        }}>J</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4ff' }}>Student</div>
          <div style={{ fontSize: 11, color: 'rgba(0,190,255,0.55)', fontWeight: 500 }}>Level 7 · 6870 XP</div>
        </div>
        <button
          onClick={onLogout}
          title="Logout"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,61,107,0.5)', fontSize: 16, padding: 4,
            lineHeight: 1, flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff3d6b')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,61,107,0.5)')}
        >⏻</button>
      </div>
    </aside>
  )
}
