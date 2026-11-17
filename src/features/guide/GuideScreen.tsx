import { Bell, ChevronDown, Map, MessageCircle, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { Button } from '../../components/ui/Button'
import { CrownIcon } from '../../components/ui/CrownIcon'
import { useApp } from '../../context/AppContext'
import mascotWave from '../../assets/mascot/wave.webp'
import { requestTour } from './tourState'

// 마이 > 이용 가이드: 기능별 짧은 설명 + 자주 묻는 것. 아래 버튼으로 지도 둘러보기를 다시 본다
const sections: { title: string; icon: LucideIcon; items: React.ReactNode[] }[] = [
  { title: '지도', icon: Map, items: [
    <><b>파란 원</b>이 내 주변 150m예요. 이 안에서 올라온 글이 핀으로 떠요.</>,
    <>핀을 누르면 아래에 요약이 뜨고, <b>자세히 보기</b>로 글 전체를 봐요.</>,
    <>숫자가 붙은 핀은 같은 자리 글 묶음이에요. 요약 카드에서 넘겨 봐요.</>,
    <>지도를 옮긴 뒤 <b>이 지역에서 다시 찾기</b>를 누르면 그 주변 글을 불러와요.</>,
  ] },
  { title: '글 올리기', icon: Plus, items: [
    <>가운데 <b>작성</b> 버튼으로 카테고리, 내용, 사진을 올려요.</>,
    <>공개 범위는 150 · 250 · 350m 중에 골라요. 작을수록 현장 가까운 사람에게만 보여요.</>,
    <>비슷한 글이 이미 있으면 먼저 보여 줘요. 같은 일이면 그 글에 댓글로 더해 주세요.</>,
    <>작성자 표시를 익명으로 바꿔 올릴 수 있어요.</>,
  ] },
  { title: '반응 · 댓글', icon: MessageCircle, items: [
    <>반응 <b>궁금해요 · 진행 중 · 유익해요 · 끝났어요</b>로 지금 상황을 한 번에 알려요.</>,
    <>댓글에는 도움돼요 · 맞아요 · 정보가 달라요로 공감해요.</>,
    <>글이 올라오고 30분 뒤 공감이 많은 댓글 2개로 <b>댓글 투표</b>가 열려요.</>,
    <>150m 밖 글은 읽기만 할 수 있어요.</>,
  ] },
  { title: '알림', icon: Bell, items: [
    <>화면 오른쪽 위 <b>종</b>에서 내 글의 댓글 · 반응 소식을 봐요.</>,
    <>게시판 목록 카드의 종 아이콘으로 글마다 알림을 켜고 꺼요.</>,
    <>받을 알림 종류는 마이 → 알림 설정에서 골라요.</>,
  ] },
  { title: '활동', icon: CrownIcon, items: [
    <>하단 <b>활동</b> 탭에서 칭호 · 뱃지와 동네 랭킹을 봐요.</>,
    <>글 · 댓글 참여와 받은 공감이 쌓이면 칭호가 올라가요.</>,
  ] },
]

const faqs = [
  { q: '글이 안 올라가요', a: '150m 밖이거나, 버스 · 기차처럼 빠르게 이동하는 중이면 올릴 수 없어요. 멈춘 자리에서 10초쯤 기다리면 다시 올릴 수 있어요. 위치 권한이 꺼져 있어도 글쓰기 · 댓글이 막혀요.' },
  { q: '글이 지도에서 사라졌어요', a: '작성자가 종료했거나 기한이 지나 종료된 글이에요. 내가 보거나 참여한 글은 마이 → 최근 활동내역 → 종료된에서 다시 볼 수 있어요.' },
  { q: '내 정확한 위치가 공개되나요?', a: '아니요. 다른 사람에게는 글까지의 대략적인 거리만 보여요.' },
  { q: 'iPhone에서 알림이 안 와요', a: 'iPhone은 Safari 공유 버튼 → 홈 화면에 추가로 연 앱에서만 알림을 받을 수 있어요. 그 앱에서 마이 → 알림 설정 → 이 기기 푸시 알림을 켜 주세요.' },
]

export function GuideScreen() {
  const { go } = useApp()
  const replay = () => { requestTour(); go('home') }
  const bottom = <div className="guide-bottom"><Button className="primary" onClick={replay}>지도 둘러보기 다시 보기</Button></div>
  return <AppShell nav={false} contentClassName="guide-screen" bottomContent={bottom}>
    <BackHeader title="이용 가이드" onBack={() => go('my')}/>
    <div className="guide-hero">
      <img src={mascotWave} alt=""/>
      <div><h1>WGO 처음이라면</h1><p>내 주변 150m에서 지금 일어나는 일을 보고, 직접 알려 주는 곳이에요.</p></div>
    </div>
    {sections.map(({ title, icon: Icon, items }) => <section key={title} className="guide-section">
      <h3><Icon size={18}/>{title}</h3>
      <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </section>)}
    <section className="guide-section">
      <h3>자주 묻는 것</h3>
      <div className="guide-faq">{faqs.map(({ q, a }) => <details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</div>
    </section>
  </AppShell>
}
