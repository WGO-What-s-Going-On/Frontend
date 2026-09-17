import { useState } from 'react'
import { Bell, Map, MessageSquare, Plus, UserRound } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { QuickCreateSheet } from '../../features/board/QuickCreateSheet'
import type { Screen } from '../../types/domain'

const tabs: { screen: Screen; label: string; icon: typeof Map }[] = [
  { screen: 'home', label: '지도', icon: Map },
  { screen: 'board', label: '게시판', icon: MessageSquare },
  { screen: 'alerts', label: '알림', icon: Bell },
  { screen: 'my', label: 'MY', icon: UserRound },
]

function activeTab(screen: Screen) {
  if (['search', 'detail', 'outside', 'edit'].includes(screen)) return 'board'
  if (screen === 'create') return 'category'
  if (['activity', 'profile-edit', 'settings', 'admin'].includes(screen)) return 'my'
  return screen
}

export function AppShell({ children, nav = true, contentClassName = '', shellClassName = '' }: { children: React.ReactNode; nav?: boolean; contentClassName?: string; shellClassName?: string }) {
  const { screen, go, notices, toast } = useApp()
  const [composerOpen, setComposerOpen] = useState(false)
  const active = activeTab(screen)
  const unreadNotices = notices.filter((notice) => !notice.read).length
  return <main className={`phone ${shellClassName}`.trim()}>
    <div className="status-bar"><strong>9:41</strong><span className="prototype-label">흐름 검증용</span></div>
    <section className={`screen ${contentClassName}`.trim()}>{children}</section>
    {nav && <><nav className="bottom-nav ux-bottom-nav">{tabs.map(({ screen: target, label, icon: Icon }) => <button key={target} className={active === target ? 'active' : ''} onClick={() => go(target)}><span className="nav-icon-wrap"><Icon size={22}/>{target === 'alerts' && unreadNotices > 0 && <b>{unreadNotices}</b>}</span><span>{label}</span></button>)}</nav><button className="compose-fab" onClick={() => setComposerOpen(true)} aria-label="새 글 작성"><Plus size={23}/><span>작성</span></button></>}
    {composerOpen && <QuickCreateSheet onClose={() => setComposerOpen(false)}/>}
    {toast && <div className="toast" role="status">{toast}</div>}
    <div className="home-indicator"/>
  </main>
}
