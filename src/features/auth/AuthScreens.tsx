import { useState } from 'react'
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
  const [locationAllowed, setLocationAllowed] = useState(false)
  const start = () => { setInRange(locationAllowed); go(locationAllowed ? 'home' : 'outside') }
  return <AppShell nav={false}>
    <div className="row"><span className="pill mint">왓츠고잉온</span><span className="eyebrow blue">What’s Going On?</span></div>
    <h1>내 주변 150m,<br/>실시간 소통의 시작</h1><p className="muted">위치 권한을 허용하면 현장 게시판에 참여할 수 있습니다.</p>
    <div className="range-card"><span className="badge red">현장 상황</span><div className="range"><i/></div><span className="badge chat right">질문과 답변</span></div>
    <label className="permission-row"><input type="checkbox" checked={locationAllowed} onChange={(event) => setLocationAllowed(event.target.checked)}/><span><strong>위치 권한 허용</strong><small>현재 위치는 150m 참여 판정에만 사용됩니다.</small></span></label>
    <button className="primary" onClick={start}>{locationAllowed ? '위치 확인 후 시작' : '열람 모드로 시작'}</button>
  </AppShell>
}
