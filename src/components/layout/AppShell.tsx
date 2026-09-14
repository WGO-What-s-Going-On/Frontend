import { Bell, Map, MessageSquare, PlusCircle, UserRound } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Screen } from '../../types/domain'

const tabs: { screen: Screen; label: string; icon: typeof Map }[] = [
  { screen: 'home', label: '지도', icon: Map },
  { screen: 'board', label: '게시판', icon: MessageSquare },
  { screen: 'category', label: '작성', icon: PlusCircle },
  { screen: 'alerts', label: '알림', icon: Bell },
  { screen: 'my', label: 'MY', icon: UserRound },
]

function activeTab(screen: Screen) {
  if (['search', 'detail', 'outside', 'edit'].includes(screen)) return 'board'
  if (screen === 'create') return 'category'
  if (['activity', 'profile-edit', 'settings', 'admin'].includes(screen)) return 'my'
  return screen
}

export function AppShell({ children, nav = true, contentClassName = '' }: { children: React.ReactNode; nav?: boolean; contentClassName?: string }) {
  const { screen, go, toast } = useApp()
  const active = activeTab(screen)
  return <main className="phone">
    <div className="status-bar"><strong>9:41</strong><span className="prototype-label">흐름 검증용</span></div>
    <section className={`screen ${contentClassName}`.trim()}>{children}</section>
    {nav && <nav className="bottom-nav">{tabs.map(({ screen: target, label, icon: Icon }) => <button key={target} className={active === target ? 'active' : ''} onClick={() => go(target)}><Icon size={22}/><span>{label}</span></button>)}</nav>}
    {toast && <div className="toast" role="status">{toast}</div>}
    <div className="home-indicator"/>
  </main>
}
