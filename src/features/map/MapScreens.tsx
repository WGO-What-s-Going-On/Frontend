import { useState } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { CategoryChips, applyBoardFilters, type CategoryFilter } from '../../components/ui/FilterBar'
import { useApp } from '../../context/AppContext'
import { QuickCreateSheet } from '../board/QuickCreateSheet'
import { BoardDetailScreen } from '../board/BoardScreens'
import { NearbySheet, type Snap } from './NearbySheet'
import type { Board } from '../../types/domain'

function markerLabel(board: Board) {
  if (board.id === 'fire') return '화재 신고'
  if (board.id === 'mask') return '마스크 나눔'
  if (board.id === 'outage') return '정전 제보'
  if (board.id === 'market') return '야시장'
  if (board.id === 'water') return '단수 복구'
  return board.title.slice(0, 8)
}

export function MapScreen() {
  const { go, boards, comments, openBoard, inRange, setInRange } = useApp()
  const [category, setCategory] = useState<CategoryFilter>('전체')
  const [selectedId, setSelectedId] = useState<string>()
  // 첫 진입에서 지도만 보이면 무엇을 눌러야 할지 알 수 없다. 목록을 한 단계 열어 둔 상태로 시작한다.
  const [snap, setSnap] = useState<Snap>('list')
  const [composerOpen, setComposerOpen] = useState(false)
  const nearby = applyBoardFilters(boards, { category, sort: '거리', joinableOnly: false, inRange })
  const commentCounts = boards.reduce<Record<string, number>>((counts, board) => {
    counts[board.id] = comments.filter((comment) => comment.boardId === board.id).length
    return counts
  }, {})

  const selectBoard = (board: Board) => {
    setSelectedId((current) => current === board.id ? undefined : board.id)
    if (snap === 'peek') setSnap('list')
  }

  return <AppShell shellClassName="map-shell" contentClassName="map-screen" fab={false}>
    <div className="map" onClick={() => setSelectedId(undefined)}>
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
      {nearby.map((board, index) => <button
        key={board.id}
        className={`map-pin marker-${index % 5} ${selectedId === board.id ? 'active' : ''} ${board.status === '종료됨' ? 'finished' : ''}`}
        onClick={(event) => { event.stopPropagation(); selectBoard(board) }}
      >{markerLabel(board)}</button>)}
    </div>

    <div className="map-top-overlay">
      <header><h1>내 주변 지도</h1><button className="icon map-search" onClick={() => go('search')} aria-label="검색"><Search size={26}/></button></header>
      {/* docs의 '프로토타입 스위치'. 이것이 없어 범위 밖 흐름을 눌러볼 방법이 아예 없었다. */}
      <button className="range-switch" onClick={() => setInRange(!inRange)} aria-pressed={!inRange}>
        내 위치: <b>{inRange ? '150m 안' : '150m 밖'}</b><span>{inRange ? '참여 가능' : '읽기 전용'} · 눌러서 전환</span>
      </button>
    </div>

    <NearbySheet
      boards={nearby}
      commentCounts={commentCounts}
      inRange={inRange}
      selectedId={selectedId}
      onSelect={selectBoard}
      onOpen={(board) => openBoard(board.id)}
      snap={snap}
      onSnapChange={setSnap}
      onCompose={() => setComposerOpen(true)}
    >
      <CategoryChips value={category} onChange={(next) => { setCategory(next); setSelectedId(undefined) }}/>
    </NearbySheet>

    {composerOpen && <QuickCreateSheet onClose={() => setComposerOpen(false)}/>}
  </AppShell>
}

/**
 * 범위 밖에서도 "게시판은 확인할 수 있다"는 것이 명세인데, 이 화면은 댓글을 아예 보여주지 않았다.
 * 상세 화면이 이미 참여 제한을 다루므로 같은 화면을 읽기 전용으로 재사용한다. (경로는 그대로 유지)
 */
export function OutsideRangeScreen() {
  return <BoardDetailScreen/>
}
