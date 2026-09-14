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
    <div className="start-card"><h3>간편하게 시작하기</h3><button className="kakao" onClick={() => go('intro')}>카카오로 계속하기</button></div>
  </AppShell>
}

export function IntroScreen() {
  const { go, setInRange } = useApp()
  const allowLocation = () => { setInRange(true); go('home') }
  const browseWithoutLocation = () => { setInRange(false); go('home') }
  return <AppShell nav={false} contentClassName="permission-screen">
    <div className="row"><span className="pill mint">왓츠고잉온</span><span className="eyebrow blue">What’s Going On?</span></div>
    <h1 className="permission-title">내 주변 150m에서<br/>지금 일어나는 일을 확인해요</h1>
    <p className="muted permission-copy">위치를 확인하면 가까운 게시글을 보고<br/>현장 대화에 참여할 수 있어요</p>
    <div className="permission-visual" aria-hidden="true">
      <div className="permission-radius"><span className="nearby-dot dot-one"/><span className="nearby-dot dot-two"/><span className="nearby-dot dot-three"/><b><MapPin size={28} strokeWidth={1.8}/></b></div>
      <small>내 위치 기준 150m</small>
    </div>
    <div className="permission-actions">
      <button className="primary" onClick={allowLocation}>위치 권한 허용하기</button>
      <button className="secondary-button" onClick={browseWithoutLocation}>권한 없이 둘러보기</button>
      <p>권한 없이도 게시글을 볼 수 있지만 참여는 제한됩니다</p>
    </div>
  </AppShell>
}
