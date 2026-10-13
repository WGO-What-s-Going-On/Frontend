import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'

// 첫 화면 연출: 밝은 동네 지도 위 반경 150m. 원 안에 있는 사람들이 차례로 궁금한 걸 묻는다.
// 사람 점이 먼저 나타나고 그 점에서 말풍선이 떠올라 둥둥 떠 있다가, 함께 사라지고 다시 반복된다.
// tone: 긴급(빨강)·도움(주황)·동네(초록) — 사람 점 색으로 어떤 이야기인지 구분한다.
const people = [
  { id: 'crowd', tone: 'news', text: <>여기 누가 오길래<br/>이렇게 사람이 많지?</> },
  { id: 'siren', tone: 'urgent', text: <>무슨 일이길래<br/>119랑 경찰차가 왔지?</> },
  { id: 'team', tone: 'news', text: <>근처에 같이<br/>팀플할 사람 있나?</> },
  { id: 'lost', tone: 'help', text: <>백화점 가는 길<br/>아시는 분 있나요?</> },
  { id: 'food', tone: 'news', text: <>이 동네 찐 맛집<br/>추천받고 싶다!</> },
]

export function LoginScreen() {
  const { go } = useApp()
  return <AppShell nav={false} contentClassName="login-screen login-scene-screen" shellClassName="login-shell login-scene-shell">
    <p className="eyebrow blue">What’s Going On?</p><h1 className="hero">주변에서 일어나는 일을<br/>묻거나 즉시 확인하세요</h1>
    <div className="login-scene" aria-hidden="true">
      <div className="scene-map">
        <i className="scene-block scene-block-a"/><i className="scene-block scene-block-b"/><i className="scene-block scene-block-c"/><i className="scene-block scene-block-d"/>
        <i className="scene-park"/><i className="scene-river"/>
        <i className="scene-road scene-road-a"/><i className="scene-road scene-road-b"/><i className="scene-road scene-road-c"/>
      </div>
      <div className="scene-radius"><i className="scene-scan"/><small>150m</small></div>
      <span className="scene-me"/>
      {people.map((person) => <span key={person.id} className={`scene-person scene-person-${person.id} tone-${person.tone}`}>
        <i className="scene-dot"/>
        <span className="scene-bubble"><span>{person.text}</span></span>
      </span>)}
    </div>
    <div className="start-card"><h3>간편하게 시작하기</h3><Button className="kakao" onClick={() => go('home')}>카카오로 계속하기</Button></div>
  </AppShell>
}
