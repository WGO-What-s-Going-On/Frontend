import { useEffect, useState } from 'react'
import { Bell, MapPin } from 'lucide-react'
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

// 라이트 모드 첫 화면: 주변에 질문이 올라오면 이웃들이 바로 댓글로 답하는 장면을 짧게 보여준다.
// 떠 있는 위치 핀 → 알림 → 게시글 → 이웃 댓글(입력 중 … → 말풍선) → 내 답장 → 사라짐을 반복한다.
const dayTimeline = [
  [1, 700],   // 알림이 내려온다
  [2, 1400],  // 게시글 카드 (핀은 물러난다)
  [3, 1900],  // 알림이 올라간다, 첫 이웃 입력 중
  [4, 2300],  // 첫 댓글
  [5, 2700],  // 둘째 이웃 입력 중
  [6, 3100],  // 둘째 댓글
  [7, 3700],  // 내 답장
  [8, 6000],  // 모두 사라짐
  [0, 6700],  // 처음부터 다시
] as const

function DayScene() {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [step, setStep] = useState(reduced ? 7 : 0)
  useEffect(() => {
    if (reduced) return
    let timers: number[] = []
    const run = () => {
      timers = dayTimeline.map(([next, at]) => window.setTimeout(() => { setStep(next); if (next === 0) run() }, at))
    }
    run()
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [reduced])
  const on = (from: number) => step >= from && step < 8 ? 'on' : ''
  return <div className="login-day" aria-hidden="true">
    <div className={`day-pin ${step < 2 ? 'on' : ''}`}><span><MapPin size={28} strokeWidth={2}/></span><small>150m</small></div>
    <div className={`day-toast ${step >= 1 && step < 3 ? 'on' : ''}`}><Bell size={15}/><span>주변에 새 글이 올라왔어요</span></div>
    <div className="day-stage">
      <div className={`day-card ${on(2)}`}>
        <div className="day-card-top"><span className="day-category">긴급/사고</span><b className="day-hot">HOT</b><small>24m · 방금 전</small></div>
        <strong>강남역에 구급차, 무슨 일인가요?</strong>
      </div>
      <div className="day-thread">
        <div className={`day-comment ${on(3)}`}><small>현장확인자 · 30m</small>{step === 3 ? <span className="day-typing"><i/><i/><i/></span> : <span className="day-bubble">편의점 앞에서 불 났어요</span>}</div>
        <div className={`day-comment ${on(5)}`}><small>퇴근길 · 60m</small>{step === 5 ? <span className="day-typing"><i/><i/><i/></span> : <span className="day-bubble">4번 출구 막혔어요! 2번으로 돌아가세요</span>}</div>
        <div className={`day-comment mine ${on(7)}`}><span className="day-bubble">감사해요</span></div>
      </div>
    </div>
  </div>
}

export function LoginScreen() {
  const { startLogin, themeMode } = useApp()
  if (themeMode !== 'dark') return <AppShell nav={false} contentClassName="login-screen login-day-screen" shellClassName="login-shell login-day-shell">
    <p className="eyebrow blue">What’s Going On?</p><h1 className="hero">주변에서 일어나는 일을<br/>즉시 확인하세요</h1>
    <DayScene/>
    <div className="start-card"><h3>간편하게 시작하기</h3><Button className="kakao" onClick={startLogin}>카카오로 계속하기</Button></div>
  </AppShell>
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
    <div className="start-card"><h3>간편하게 시작하기</h3><Button className="kakao" onClick={startLogin}>카카오로 계속하기</Button></div>
  </AppShell>
}
