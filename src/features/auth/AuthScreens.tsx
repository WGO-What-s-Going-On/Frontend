import { MapPin } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function LoginScreen() {
  const { go } = useApp()
  return <AppShell nav={false} contentClassName="login-screen" shellClassName="login-shell">
    <p className="eyebrow blue">What’s Going On?</p><h1 className="hero">주변에서 일어나는 일을<br/>묻거나 즉시 확인하세요</h1>
    <div className="illustration login-background" aria-hidden="true">
      <div className="signal-animation">
        <span className="signal-ring signal-ring-one"/>
        <span className="signal-ring signal-ring-two"/>
        <span className="signal-ring signal-ring-three"/>
        <span className="signal-core"><MapPin size={34} strokeWidth={1.7}/></span>
      </div>
    </div>
    <div className="start-card"><h3>간편하게 시작하기</h3><button className="kakao" onClick={() => go('home')}>카카오로 계속하기</button></div>
  </AppShell>
}
