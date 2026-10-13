import { MapPin } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'

// 첫 화면 연출: 밤거리 사건 현장에서 반경 150m 사람들이 궁금한 걸 묻는 장면.
// 말풍선은 차례로 떠올라 둥둥 떠 있다가 함께 사라지고, 다시 반복된다.
const bubbles = [
  { id: 'crowd', text: <>여기 누가 오길래<br/>이렇게 사람이 많지?</> },
  { id: 'siren', text: <>무슨 일이길래<br/>119랑 경찰차가 왔지?</> },
  { id: 'lost', text: <>백화점 가는 길<br/>아시는 분 있나요?</> },
  { id: 'food', text: <>이 동네 찐 맛집<br/>추천받고 싶다!</> },
  { id: 'team', text: <>근처에 같이<br/>팀플할 사람 있나?</> },
]

export function LoginScreen() {
  const { go } = useApp()
  return <AppShell nav={false} contentClassName="login-screen login-night-screen" shellClassName="login-shell login-night-shell">
    <p className="eyebrow blue">What’s Going On?</p><h1 className="hero">주변에서 일어나는 일을<br/>즉시 확인하세요</h1>
    <div className="login-night" aria-hidden="true">
      <span className="night-light night-light-red"/>
      <span className="night-light night-light-blue"/>
      <span className="night-light night-light-warm"/>
      <span className="night-light night-light-warm-two"/>
      <div className="night-radius">
        <i className="night-ring night-ring-outer"/>
        <i className="night-ring night-ring-middle"/>
        <i className="night-ring night-ring-inner"/>
        <i className="night-ring night-ring-scan"/>
        <span className="night-pin"><MapPin size={26} strokeWidth={2}/></span>
        <small>150m</small>
      </div>
      {bubbles.map((bubble) => <span key={bubble.id} className={`night-bubble night-bubble-${bubble.id}`}><span>{bubble.text}</span></span>)}
    </div>
    <div className="start-card"><h3>간편하게 시작하기</h3><Button className="kakao" onClick={() => go('home')}>카카오로 계속하기</Button></div>
  </AppShell>
}
