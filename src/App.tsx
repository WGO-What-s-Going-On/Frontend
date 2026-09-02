import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, Camera, ChevronRight, Heart, Map,
  MapPin, MessageSquare, PlusCircle, Search, Send, UserRound, X,
} from 'lucide-react'

type Screen = 'login' | 'intro' | 'home' | 'board' | 'search' | 'detail' | 'category' | 'create' | 'my' | 'activity' | 'alerts'

const posts = [
  { category: '긴급 사고', tone: 'red', time: '2분 전 · 24m 안', title: '동네에 불 났어! 어디 대피해야 돼?', body: '강남역 4번 출구 앞에서 연기가 보여요. 주변 분들은 우회해주세요.', reactions: [18, 32, 12, 3] },
  { category: '동네 소식', tone: 'blue', time: '15분 전 · 80m', title: '마스크 나눔 오후 3시 집 앞에서 해요!', body: '남는 보건용 마스크를 경비실 앞에 두고 갑니다.', reactions: [7, 14, 21, 2] },
  { category: '일상 불편', tone: 'yellow', time: '30분 전 · 140m', title: '정전이야! 1시간 넘는데 복구 될까?', body: '혹시 아파트 전체 정전인가요? 상황 공유 부탁드려요.', reactions: [12, 23, 8, 1] },
]

const postReactionLabels = ['저도 궁금해요', '지금도 그래요', '도움 됐어요', '이제 끝났어요']

function PostReactions({ counts }: { counts: number[] }) {
  return <div className="post-reactions">{postReactionLabels.map((label, index) => <span key={label}><b>{label}</b> {counts[index]}</span>)}</div>
}

function CommentReactions({ initial }: { initial: number[] }) {
  const labels = ['도움돼요', '맞아요', '정보가 달라요']
  const [selected, setSelected] = useState<number | null>(null)
  return <div className="comment-reactions">{labels.map((label, index) => <button key={label} className={selected === index ? 'selected' : ''} onClick={() => setSelected(selected === index ? null : index)}>{label} <b>{initial[index] + (selected === index ? 1 : 0)}</b></button>)}</div>
}

const tabs: { screen: Screen; label: string; icon: typeof Map }[] = [
  { screen: 'home', label: '지도', icon: Map },
  { screen: 'board', label: '게시판', icon: MessageSquare },
  { screen: 'category', label: '작성', icon: PlusCircle },
  { screen: 'alerts', label: '알림', icon: Bell },
  { screen: 'my', label: 'MY', icon: UserRound },
]

function StatusBar() {
  return <div className="status-bar"><strong>9:41</strong></div>
}

function BottomNav({ current, go }: { current: Screen; go: (s: Screen) => void }) {
  const active = current === 'search' || current === 'detail' ? 'board' : current === 'create' ? 'category' : current === 'activity' ? 'my' : current
  return <nav className="bottom-nav">
    {tabs.map(({ screen, label, icon: Icon }) => <button key={screen} className={active === screen ? 'active' : ''} onClick={() => go(screen)}><Icon size={22}/><span>{label}</span></button>)}
  </nav>
}

function Shell({ children, screen, go, nav = true }: { children: React.ReactNode; screen: Screen; go: (s: Screen) => void; nav?: boolean }) {
  return <main className="phone"><StatusBar/><section className="screen">{children}</section>{nav && <BottomNav current={screen} go={go}/>}<div className="home-indicator"/></main>
}

function Login({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="login" go={go} nav={false}>
    <p className="eyebrow blue">What’s Going On?</p><h1 className="hero">지금 여기,<br/>무슨 일이야?</h1>
    <div className="illustration"><span className="badge red">🔥 화재 제보</span><b className="mint-dot">!</b><b className="question-dot">?</b><span className="badge chat">💬 150m 현장 토크</span></div>
    <p className="muted intro-copy">사람이 몰린 이유, 119 출동, 촬영 현장, 길 찾기까지. 주변 150m 안의 사람에게 바로 물어보세요.</p>
    <div className="start-card"><h3>간편하게 시작하기</h3><p>닉네임과 위치 권한만 있으면 바로 사용할 수 있어요.</p><button className="kakao" onClick={() => go('intro')}>카카오로 계속하기</button><small>🛡 위치는 참여 가능 여부 판단에만 사용</small></div>
  </Shell>
}

function Intro({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="intro" go={go} nav={false}>
    <div className="row"><span className="pill mint">왓츠고잉온</span><span className="eyebrow blue">What’s Going On?</span></div>
    <h1>내 주변 150m,<br/>실시간 소통의 시작</h1><p className="muted">지금 내 근처에서 일어나는 모든 일을 이웃과 실시간으로 공유하고 빠르게 물어보세요.</p>
    <div className="range-card"><span className="badge red">🚒 소방차 출동</span><div className="range"><i/></div><span className="badge chat right">💬 촬영중인가요?</span></div>
    <div className="steps">{[['1','내 주변 확인','지도상에서 내 반경 150m 내 사건들을 한눈에 봐요.'],['2','실시간 게시판 참여','주변 150m 안 사람만 쓸 수 있는 대화방에 참여해요.'],['3','이웃과 소통','궁금한 건 바로 묻고 답하며 생생한 정보를 나눠요.']].map(([n,t,d])=><div className="step" key={n}><b>{n}</b><div><strong>{t}</strong><p>{d}</p></div></div>)}</div>
    <button className="primary" onClick={() => go('home')}>시작하기</button>
  </Shell>
}

function Home({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="home" go={go}>
    <header><h1>내 주변 지도</h1><button className="icon" onClick={() => go('search')}><Search/></button></header>
    <div className="chips"><span className="selected">전체</span><span>긴급/사고</span><span>도움요청</span><span>HOT</span></div>
    <div className="map"><i className="road-v"/><i className="road-h"/><span className="map-pin fire">화재 중 🚨</span><span className="map-pin outage">정전인가요? ⚡</span><div className="radius"><b/><small>150m 영역</small></div></div>
    <button className="reach" onClick={() => go('board')}><span><small>내 주변 참여인원</small><strong>38명</strong></span><p>현재 위치 150m 안에서 게시판 실시간 참여 및 댓글 작성이 가능합니다.</p></button>
    <div className="peek"><span/><strong>주변에서 지금 일어나는 일</strong><p>핀이나 게시판을 눌러 현장 이야기를 확인하세요.</p></div>
  </Shell>
}

function Board({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="board" go={go}>
    <header><h1>실시간 게시판</h1><button className="mini-primary" onClick={() => go('category')}>＋ 새 글</button></header>
    <button className="search-box" onClick={() => go('search')}><Search size={18}/> 장소, 사건, 도움 요청 검색</button>
    <div className="chips sort"><span className="dark">거리순</span><span>최신순</span><span>공감순</span></div>
    <div className="post-list">{posts.map((p)=><article className="post-card clickable" key={p.title} onClick={() => go('detail')}><div className="row"><span className={`badge ${p.tone}`}>{p.category}</span><small>{p.time}</small></div><h3>{p.title}</h3><PostReactions counts={p.reactions}/></article>)}</div>
  </Shell>
}

function SearchPage({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="search" go={go}>
    <div className="search-input"><Search size={19}/><input defaultValue="119" autoFocus/><button onClick={() => go('board')}><X size={18}/></button></div>
    <h4>최근 검색어</h4><div className="chips"><span>야매 대기열</span><span>119 출동 상황</span><span>벡스코 정전</span><span>날씨 상황</span></div>
    <h4>열람 범위</h4><div className="segment"><button className="active">150m 안</button><button>근처 요약</button><button>전체 핀</button></div>
    <h4>인기 실시간 키워드</h4>{['근처 LH 오후 소낫','건물 안 미달 붕괴 주의'].map((x,i)=><button className="keyword" key={x} onClick={() => go('detail')}><span><strong>{x}</strong><small>{i?'긴급 사고 · 10분 전':'동네 소식 · 방금 전'}</small></span><ArrowRight size={18}/></button>)}
  </Shell>
}

function Detail({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="detail" go={go}>
    <header className="detail-head"><button className="icon" onClick={() => go('board')}><ArrowLeft/></button><h2>용아맥 앞 상황</h2><span className="pill mint">현장 인증됨</span></header>
    <article className="topic"><h2>사람들이 절반 치우 확인 중</h2><p>150m 안의 현장 인증 사용자만 생생한 댓글과 실시간 사진 제보가 가능해요.</p><div><span>댓글 28</span><span>공감 96</span></div></article>
    <div className="comment"><p>오늘 GV 이벤트 있어서 줄 생긴 것 같아요.</p><small>익명탐정 · 2분 전</small><CommentReactions initial={[12, 5, 1]}/></div>
    <div className="comment verified"><p>맞아요. 직원분이 7시 입장이라고 안내했어요.</p><small>✓ 현장 인증됨 · 방금 전</small><CommentReactions initial={[4, 18, 0]}/></div>
    <button className="photo"><Camera/> 현장 사진 확인 / 제보하기</button>
    <div className="comment-input"><input placeholder="현장 댓글 남기기"/><button><Send size={20}/></button></div>
  </Shell>
}

function Category({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="category" go={go}>
    <h1>상황 카테고리 제보</h1><p className="muted">지금 현장의 상황에 딱 맞는 테마를 선택해 동네 사람들과 빠르고 명확하게 소통하세요.</p>
    <button className="category red-border" onClick={() => go('create')}><span><strong>긴급 사고 / 재난</strong><small>화재, 붕괴, 구급차 상황 등</small></span><ChevronRight/></button>
    <button className="category blue-border" onClick={() => go('create')}><span><strong>교통 소식</strong><small>사고 대기열, 갑작스런 정체 상황</small></span><ChevronRight/></button>
    <button className="category" onClick={() => go('create')}><span><strong>✎ 카테고리 없이 빠르게 글쓰기</strong></span></button>
  </Shell>
}

function Create({ go }: { go: (s: Screen) => void }) {
  const [title,setTitle]=useState('')
  return <Shell screen="create" go={go}>
    <h1>게시판 만들기</h1><div className="live-card"><small>현재 위치 150m 안</small><strong>참여 가능 38명</strong><p>정확한 내 실시간 상세 위치는 다른 이에게 노출되지 않아요.</p></div>
    <label>카테고리</label><div className="chips"><span className="red selected">긴급 사고</span><span>도움 요청</span><span>동네 소식</span></div>
    <label>제목</label><input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="무슨 일이 궁금한가요?"/>
    <label>상황 설명</label><textarea className="field" placeholder="개인정보가 보이는 사진/내용은 게시할 수 없어요."/>
    <div className="options"><strong>✓ 투표 추가하기</strong><span>◎ 전체 공개</span></div>
    <button className="primary" onClick={() => go('board')} disabled={!title.trim()}>게시판 열기</button>
  </Shell>
}

function MyPage({ go }: { go: (s: Screen) => void }) {
  return <Shell screen="my" go={go}>
    <h1>마이페이지</h1><div className="profile"><b>이</b><div><h3>이현정 님 24</h3><p>현장 인증 활동 회원 · 안전 가이드 준수</p></div></div>
    <div className="metrics"><span><strong>12</strong><small>참여 게시판</small></span><span><strong>96</strong><small>받은 공감</small></span><span><strong>3</strong><small>작성한 글</small></span></div>
    <h4>나의 활동</h4><button className="menu" onClick={() => go('activity')}>최근 활동내역 보기 <ChevronRight/></button>
    <h4>설정 및 정책</h4><div className="menu-group"><button>계정관리 / 앱 설정 <ChevronRight/></button><button>개인정보처리 / 운영 정책 <ChevronRight/></button></div>
  </Shell>
}

function Activity({ go }: { go: (s: Screen) => void }) {
  const activityPosts=useMemo(()=>[...posts,...posts],[])
  return <Shell screen="activity" go={go}>
    <header className="left"><button className="icon" onClick={() => go('my')}><ArrowLeft/></button><h2>최근 활동 내역</h2></header><div className="chips"><span className="mint selected">전체</span><span>내가 만든</span><span>참여한</span><span>댓글 단</span></div>
    <div className="post-list compact">{activityPosts.map((p,i)=><article className="post-card clickable" key={i} onClick={()=>go('detail')}><div className="row"><span className={`badge ${p.tone}`}>{p.category}</span><small>{p.time}</small></div><h3>{p.title}</h3><p>{p.body}</p><PostReactions counts={p.reactions}/><small className={i%3?'done':'live'}>● {i%3?'종료됨':'실시간'}</small></article>)}</div>
  </Shell>
}

function Alerts({ go }: { go: (s: Screen) => void }) {
  const alerts=[['pin','내 주변 150m 이내에 새 게시판이 생성되었어요','3분 전'],['comment','회원님의 댓글에 답글이 달렸어요: “저도 같은 상황이에요”','15분 전'],['heart','회원님의 댓글에 공감 3개가 달렸어요','1시간 전'],['activity','내가 만든 게시판 “동네 침수 상황”에 새로운 댓글 5개와 공감 12개가 추가되었어요.','어제'],['clock','“정전 신고 게시판”이 곧 종료됩니다','2일 전']]
  return <Shell screen="alerts" go={go}><header><h1>알림</h1><button className="text-button">모두 읽음</button></header><div className="alerts">{alerts.map(([type,text,time],i)=><button className={`alert ${type==='activity'?'highlight':''}`} key={text} onClick={()=>go(type==='pin'?'home':'detail')}><b>{type==='pin'?'⌾':type==='comment'?'□':type==='heart'?'♡':type==='clock'?'◷':'내 게시판 활동'}</b><span><strong>{text}</strong><small>{time}</small></span>{i===0&&<i/>}</button>)}</div></Shell>
}

export default function App() {
  const [screen,setScreen]=useState<Screen>('login')
  const go=(next:Screen)=>{setScreen(next);window.scrollTo({top:0,behavior:'smooth'})}
  const pages:Record<Screen,React.ReactElement>={login:<Login go={go}/>,intro:<Intro go={go}/>,home:<Home go={go}/>,board:<Board go={go}/>,search:<SearchPage go={go}/>,detail:<Detail go={go}/>,category:<Category go={go}/>,create:<Create go={go}/>,my:<MyPage go={go}/>,activity:<Activity go={go}/>,alerts:<Alerts go={go}/>}
  return <div className="app-bg">{pages[screen]}</div>
}
