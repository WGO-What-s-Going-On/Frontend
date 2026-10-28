import { useEffect, useRef, useState } from 'react'
import { Crown, Map, MessageSquare, Plus, UserRound } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { QuickCreateSheet } from '../../features/board/QuickCreateSheet'
import { Toast } from '../ui/Toast'
import type { Screen } from '../../types/domain'

const tabs: { screen: Screen; label: string; icon: typeof Map }[] = [
  { screen: 'home', label: '지도', icon: Map },
  { screen: 'board', label: '게시판', icon: MessageSquare },
  // 알림은 각 탭 화면 오른쪽 위 종(NoticeBell)으로, 피드는 게시판의 보기 방식으로 옮겼다. 그 자리(작성 버튼 오른쪽)는 칭호·랭킹
  { screen: 'level', label: '활동', icon: Crown },
  { screen: 'my', label: '마이', icon: UserRound },
]

function activeTab(screen: Screen) {
  if (['search', 'detail', 'outside', 'edit'].includes(screen)) return 'board'
  if (['activity', 'profile-edit', 'notification-settings'].includes(screen)) return 'my'
  return screen
}

export function AppShell({ children, nav = true, contentClassName = '', shellClassName = '', bottomContent }: { children: React.ReactNode; nav?: boolean; contentClassName?: string; shellClassName?: string; bottomContent?: React.ReactNode }) {
  const { screen, go, toast } = useApp()
  const [composerOpen, setComposerOpen] = useState(false)
  const screenRef = useRef<HTMLElement>(null)
  const active = activeTab(screen)

  useEffect(() => {
    const element = screenRef.current
    const storageKey = `wgo-scroll-${screen}`
    if (!element) return
    element.scrollTop = Number(sessionStorage.getItem(storageKey) || 0)
    return () => sessionStorage.setItem(storageKey, String(element.scrollTop))
  }, [screen])

  return <main className={`phone ${shellClassName}`.trim()}>
    {/* 상태바 자리만 비워 둔다 (컴퓨터 미리보기 44px, 휴대폰은 iOS 안전 영역만큼) */}
    <div className="status-bar"/>
    <section ref={screenRef} className={`screen ${contentClassName}`.trim()}>{children}</section>
    {bottomContent}
    {nav && <><nav className="bottom-nav ux-bottom-nav">{tabs.map(({ screen: target, label, icon: Icon }) => <button key={target} className={active === target ? 'active' : ''} onClick={() => go(target)}><span className="nav-icon-wrap"><Icon size={22}/></span><span>{label}</span></button>)}</nav><button className="compose-fab" onClick={() => setComposerOpen(true)} aria-label="새 글 작성"><Plus size={23}/><span>작성</span></button></>}
    {composerOpen && <QuickCreateSheet onClose={() => setComposerOpen(false)}/>}
    <Toast message={toast}/>
    <div className="home-indicator"/>
  </main>
}
