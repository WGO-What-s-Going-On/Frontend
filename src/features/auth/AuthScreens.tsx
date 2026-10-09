import { Bell, CircleHelp, Flame, MapPin } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function LoginScreen() {
  const { go } = useApp()
  return <AppShell nav={false} contentClassName="login-screen" shellClassName="login-shell">
    <p className="eyebrow blue">What’s Going On?</p><h1 className="hero">주변에서 일어나는 일을<br/>묻거나 즉시 확인하세요</h1>
    <div className="illustration login-background" aria-hidden="true">
      <div className="nearby-animation">
        <span className="nearby-road nearby-road-one"/>
        <span className="nearby-road nearby-road-two"/>
        <span className="nearby-road nearby-road-three"/>
        <span className="nearby-road nearby-road-four"/>
        <span className="nearby-range"><i/><small>주변 150m</small></span>
        <span className="nearby-location"><MapPin size={27} strokeWidth={1.8}/></span>
        <span className="nearby-event nearby-event-fire" data-category="긴급 사고"><i><Flame size={14}/></i><b>긴급 사고</b></span>
        <span className="nearby-event nearby-event-help" data-category="도움 요청"><i><CircleHelp size={14}/></i><b>도움 요청</b></span>
        <span className="nearby-alert"><Bell size={15}/><span><small>내 주변 새 소식</small><b>지금 확인해 보세요</b></span></span>
      </div>
    </div>
    <div className="start-card"><h3>간편하게 시작하기</h3><button className="kakao" onClick={() => go('home')}>카카오로 계속하기</button></div>
  </AppShell>
}
