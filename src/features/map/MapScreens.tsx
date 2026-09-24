import { useState } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { applyBoardFilters } from '../../components/ui/FilterBar'
import { useApp } from '../../context/AppContext'
import { BoardDetailScreen } from '../board/BoardScreens'
import { NearbySheet } from './NearbySheet'
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
  const nearby = applyBoardFilters(boards, { category: '전체', sort: '거리', joinableOnly: false, inRange })
  const commentCounts = boards.reduce<Record<string, number>>((counts, board) => {
    counts[board.id] = comments.filter((comment) => comment.boardId === board.id).length
    return counts
  }, {})

  return <AppShell shellClassName="map-shell" contentClassName="map-screen">
    <div className="map">
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
      {/* 핀과 목록 행은 같은 곳으로 간다. 두 가지 경로가 다르게 동작하면 헷갈린다. */}
      {nearby.map((board, index) => <button
        key={board.id}
        className={`map-pin marker-${index % 5} ${board.status === '종료됨' ? 'finished' : ''}`}
        onClick={() => openBoard(board.id)}
      >{markerLabel(board)}</button>)}
    </div>

    <div className="map-top-overlay">
      {/* docs의 프로토타입 스위치. 없으면 범위 밖 흐름을 눌러볼 방법이 없다. */}
      <button className="range-switch" onClick={() => setInRange(!inRange)} aria-pressed={!inRange}>{inRange ? '150m 안' : '150m 밖'}</button>
      <button className="icon map-search" onClick={() => go('search')} aria-label="검색"><Search size={24}/></button>
    </div>

    <NearbySheet boards={nearby} commentCounts={commentCounts} inRange={inRange} onOpen={(board) => openBoard(board.id)}/>
  </AppShell>
}

/**
 * 범위 밖에서도 게시판은 확인할 수 있어야 한다는 것이 명세인데 이 화면은 댓글을 보여주지 않았다.
 * 상세 화면이 이미 참여 제한을 다루므로 같은 화면을 재사용한다. (경로는 유지)
 */
export function OutsideRangeScreen() {
  return <BoardDetailScreen/>
}
