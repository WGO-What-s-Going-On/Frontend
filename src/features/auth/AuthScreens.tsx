import { useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function LoginScreen() {
  const { go } = useApp()
  return <AppShell nav={false} contentClassName="login-screen">
    <p className="eyebrow blue">What’s Going On?</p><h1 className="hero">주변에서 일어나는 일을<br/>묻거나 즉시 확인하세요</h1>
    <div className="illustration"><span className="badge red">화재 제보</span><b className="mint-dot">!</b><b className="question-dot">?</b><span className="badge chat">150m 현장 토크</span></div>
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
