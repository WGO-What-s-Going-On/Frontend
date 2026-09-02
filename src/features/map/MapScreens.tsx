import { Search } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'

export function MapScreen() {
  const { go, boards, openBoard, inRange, setInRange } = useApp()
  const nearby = boards.filter((board) => board.status !== '숨김')
  return <AppShell>
    <header><h1>내 주변 지도</h1><button className="icon" onClick={() => go('search')} aria-label="검색"><Search/></button></header>
    <div className="chips"><span className="selected">전체</span><span>긴급/사고</span><span>도움요청</span><span>HOT</span></div>
    <div className="map"><i className="road-v"/><i className="road-h"/>{nearby.slice(0, 2).map((board, index) => <button key={board.id} className={`map-pin ${index ? 'outage' : 'fire'}`} onClick={() => openBoard(board.id)}>{board.title.slice(0, 9)}</button>)}<div className="radius"><b/><small>150m 영역</small></div></div>
    <button className="reach" onClick={() => go('board')}><span><small>내 주변 참여인원</small><strong>38명</strong></span><p>{inRange ? '현재 위치에서 게시판 참여 및 댓글 작성이 가능합니다.' : '현재 범위 밖이라 열람만 가능합니다.'}</p></button>
    <label className="prototype-control"><input type="checkbox" checked={inRange} onChange={(event) => setInRange(event.target.checked)}/> 프로토타입: 150m 안으로 설정</label>
  </AppShell>
}

export function OutsideRangeScreen() {
  const { currentBoard, go, setInRange } = useApp()
  if (!currentBoard) return null
  return <AppShell>
    <BackHeader title="읽기 전용 게시판" onBack={() => go('home')}/>
    <div className="notice-box"><strong>현재 참여 범위 밖입니다.</strong><p>게시판은 확인할 수 있지만 글, 댓글, 사진, 반응 작성은 제한됩니다.</p></div>
    <article className="topic"><span className="badge">{currentBoard.category}</span><h2>{currentBoard.title}</h2><p>{currentBoard.body}</p><PostReactions board={currentBoard}/></article>
    <button className="secondary-button" onClick={() => go('home')}>지도에서 다른 게시판 보기</button>
    <button className="text-link" onClick={() => { setInRange(true); go('detail') }}>프로토타입: 150m 안으로 이동</button>
  </AppShell>
}
