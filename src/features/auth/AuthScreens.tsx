import { Bell, Flame, Hand, MapPin, Megaphone } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
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
        <span className="nearby-event nearby-event-fire" data-category="긴급 사고"><i><Flame size={16}/></i><b>긴급 사고</b></span>
        <span className="nearby-event nearby-event-help" data-category="도움 요청"><i><Hand size={16}/></i><b>도움 요청</b></span>
        <span className="nearby-event nearby-event-news" data-category="동네 소식"><i><Megaphone size={16}/></i><b>동네 소식</b></span>
        <span className="nearby-alert"><Bell size={18}/><span><small>내 주변 소식</small><b>지금 확인해 보세요</b></span></span>
      </div>
    </div>
    <div className="start-card"><h3>간편하게 시작하기</h3><Button className="kakao" onClick={() => go('home')}>카카오로 계속하기</Button></div>
  </AppShell>
}
