import { useMemo } from 'react'
import { Bell, ChevronDown, CircleCheck, Map, MessageCircle, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { Button } from '../../components/ui/Button'
import { CrownIcon } from '../../components/ui/CrownIcon'
import { useApp } from '../../context/AppContext'
import mascotWave from '../../assets/mascot/wave.webp'
import { requestTour } from './tourState'
import { openedFrom, useInstallPrompt } from './homeScreen'
import { HomeScreenSteps } from './HomeScreenSteps'

// 마이 > 이용 가이드: 홈 화면에 추가(가장 먼저) · 핵심 사용법 한 줄씩 · 자주 묻는 것. 아래 버튼으로 지도 둘러보기를 다시 본다
const basics: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Map, title: '지도', text: '파란 원(150m) 안의 글이 핀으로 떠요' },
  { icon: Plus, title: '작성', text: '가운데 + 버튼, 150m 안에서만' },
  { icon: MessageCircle, title: '반응', text: '궁금해요 · 진행 중 · 유익해요 · 끝났어요' },
  { icon: Bell, title: '알림', text: '오른쪽 위 종' },
  { icon: CrownIcon, title: '활동', text: '칭호 · 뱃지 · 동네 랭킹' },
]

const faqs = [
  { q: '글이 안 올라가요', a: '150m 밖이거나 이동 중이에요. 멈춘 자리에서 10초 뒤 다시 올려요.' },
  { q: '글이 사라졌어요', a: '종료된 글이에요. 마이 → 최근 활동내역 → 종료된에서 볼 수 있어요.' },
  { q: '알림이 안 와요', a: '홈 화면에 추가한 앱에서 마이 → 알림 설정 → 이 기기 푸시 알림을 켜요.' },
]

// 홈 화면에 추가: 이걸 해야 알림을 받는다. 이미 홈 화면 앱이면 짧게 확인만, 앱(Capacitor)에서는 숨긴다
function HomeScreenCard() {
  const from = useMemo(openedFrom, [])
  const { justInstalled } = useInstallPrompt()
  if (from.native) return null
  if (from.standalone || justInstalled) return <section className="guide-home done">
    <CircleCheck size={22}/><div><h2>홈 화면 앱으로 쓰는 중</h2><p>알림을 받을 수 있어요</p></div>
  </section>
  return <section className="guide-home">
    <header><h2>홈 화면에 추가</h2><em>필수</em></header>
    <p>추가한 앱으로 열어야 알림을 받아요.</p>
    <HomeScreenSteps/>
  </section>
}

export function GuideScreen() {
  const { go } = useApp()
  const replay = () => { requestTour(); go('home') }
  const bottom = <div className="guide-bottom"><Button className="primary" onClick={replay}>지도 둘러보기 다시 보기</Button></div>
  return <AppShell nav={false} contentClassName="guide-screen" bottomContent={bottom}>
    <BackHeader title="이용 가이드" onBack={() => go('my')}/>
    <div className="guide-hero"><img src={mascotWave} alt=""/><p>내 주변 150m에서<br/>지금 일어나는 일</p></div>
    <HomeScreenCard/>
    <section className="guide-section">
      <h3>이렇게 써요</h3>
      <ul className="guide-basics">{basics.map(({ icon: Icon, title, text }) => <li key={title}><Icon size={18}/><b>{title}</b><span>{text}</span></li>)}</ul>
    </section>
    <section className="guide-section">
      <h3>자주 묻는 것</h3>
      <div className="guide-faq">{faqs.map(({ q, a }) => <details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</div>
    </section>
  </AppShell>
}
