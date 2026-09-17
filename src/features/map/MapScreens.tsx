import { useState } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import type { Board } from '../../types/domain'
import { IncidentBottomSheet } from './IncidentBottomSheet'

type MapFilter = '전체' | '긴급/사고' | '도움요청' | 'HOT'

const filters: MapFilter[] = ['전체', '긴급/사고', '도움요청', 'HOT']

function filterBoards(boards: Board[], filter: MapFilter) {
  const visible = boards.filter((board) => board.status !== '숨김')
  if (filter === '긴급/사고') return visible.filter((board) => board.category === '긴급 사고')
  if (filter === '도움요청') return visible.filter((board) => board.category === '도움 요청')
  if (filter === 'HOT') return [...visible].sort((a, b) => b.views - a.views).slice(0, 2)
  return visible
}

function markerLabel(board: Board) {
  if (board.id === 'fire') return '화재 신고'
  if (board.id === 'mask') return '마스크 나눔'
  if (board.id === 'outage') return '정전 제보'
  return board.title.slice(0, 8)
}

export function MapScreen() {
  const { go, boards, openBoard } = useApp()
  const [filter, setFilter] = useState<MapFilter>('전체')
  const [selectedBoard, setSelectedBoard] = useState<Board>()
  const nearby = filterBoards(boards, filter)
  const selectFilter = (next: MapFilter) => { setFilter(next); setSelectedBoard(undefined) }
  return <AppShell shellClassName="map-shell" contentClassName="map-screen">
    <div className="map" onClick={() => setSelectedBoard(undefined)}>
      <div className="map-water"/>
      <i className="map-road road-main"/><i className="map-road road-cross"/><i className="map-road road-diagonal"/>
      <i className="map-road road-small-one"/><i className="map-road road-small-two"/>
      <div className="map-block block-one"><span>주거 단지</span></div>
      <div className="map-block block-two"><span>상가</span></div>
      <div className="map-block block-three"><span>강남초등학교</span></div>
      <div className="map-block block-four"><span>주민센터</span></div>
      <div className="map-park"><span>새봄공원</span></div>
      <span className="map-label label-station">강남역</span><span className="map-label label-road">테헤란로</span>
      <div className="radius"><b/><small>150m</small></div>
      {nearby.map((board, index) => <button key={board.id} className={`map-pin marker-${index % 3} ${selectedBoard?.id === board.id ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); setSelectedBoard(board) }}>{markerLabel(board)}</button>)}
    </div>
    <div className="map-top-overlay">
      <header><h1>내 주변 지도</h1><button className="icon map-search" onClick={() => go('search')} aria-label="검색"><Search size={26}/></button></header>
      <div className="map-filters">{filters.map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => selectFilter(item)}>{item}</button>)}</div>
    </div>
    <button className="participant-card" onClick={() => go('board')}><small>내 주변 참여인원</small><strong>38명</strong></button>
    {selectedBoard && <IncidentBottomSheet board={selectedBoard} onClose={() => setSelectedBoard(undefined)} onOpen={() => openBoard(selectedBoard.id)}/>}
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
