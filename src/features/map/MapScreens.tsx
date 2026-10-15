import { useMemo, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { FilterChips } from '../../components/ui/FilterChips'
import { useApp } from '../../context/AppContext'
import { isHotBoard } from '../../types/domain'
import type { Board, Category } from '../../types/domain'
import { categoryLabel } from '../../domain/labels'
import { IncidentBottomSheet } from './IncidentBottomSheet'
import { MapView } from './MapView'
import { ME, boardPosition, type Point } from './mapWorld'

// 지도 필터: 게시판과 같은 카테고리 순서 + HOT. 칸이 넘치면 옆으로 밀어 넘긴다
type MapFilter = '전체' | Category | 'HOT'

const filters: { value: MapFilter; label: string }[] = [
  { value: '전체', label: '전체' },
  ...(['긴급 사고', '도움 요청', '동네 소식', '일상 불편'] as const).map((category) => ({ value: category, label: categoryLabel[category] })),
  { value: 'HOT', label: 'HOT' },
]

function filterBoards(boards: Board[], filter: MapFilter, hotIds: Set<string>) {
  // 종료·숨김 게시판은 지도에서 뺀다
  const visible = boards.filter((board) => board.status === '실시간')
  if (filter === 'HOT') return visible.filter((board) => hotIds.has(board.id))
  if (filter === '전체') return visible
  return visible.filter((board) => board.category === filter)
}

// 게시글을 보러 갔다가 돌아와도 보던 지도 상태(필터·고른 핀·검색 기준)를 그대로 보여주기 위한 기억 (새로고침하면 처음부터)
const mapMemory: { filter: MapFilter; selectedId?: string; searchCenter: Point; viewCenter: Point } = { filter: '전체', searchCenter: ME, viewCenter: ME }

export function MapScreen() {
  const { boards, comments, openBoard, showToast } = useApp()
  const [filter, setFilter] = useState<MapFilter>(filters.some((item) => item.value === mapMemory.filter) ? mapMemory.filter : '전체')
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(() => boards.find((board) => board.id === mapMemory.selectedId))
  const [searchCenter, setSearchCenter] = useState<Point>(mapMemory.searchCenter)
  const [viewCenter, setViewCenter] = useState<Point>(mapMemory.viewCenter)
  Object.assign(mapMemory, { filter, selectedId: selectedBoard?.id, searchCenter, viewCenter })
  const hotIds = useMemo(() => new Set(boards.filter((board) => isHotBoard(board, comments.filter((comment) => comment.boardId === board.id).length)).map((board) => board.id)), [boards, comments])
  const nearby = filterBoards(boards, filter, hotIds)
  const selectFilter = (next: MapFilter) => { setFilter(next); setSelectedBoard(undefined) }
  // 지도를 멀리 옮기면 '이 지역에서 다시 찾기' (MAP-F09, 실제로는 화면 영역으로 게시판을 다시 조회)
  const movedFar = Math.hypot(viewCenter.x - searchCenter.x, viewCenter.y - searchCenter.y) > 260
  const searchHere = () => {
    const count = nearby.filter((board) => { const point = boardPosition(board); return Math.hypot(point.x - viewCenter.x, point.y - viewCenter.y) <= 400 }).length
    setSearchCenter(viewCenter)
    showToast(count ? `이 지역 게시판 ${count}개를 찾았어요.` : '이 지역에는 아직 게시판이 없어요.')
  }
  return <AppShell shellClassName="map-shell" contentClassName="map-screen">
    <MapView boards={nearby} selectedId={selectedBoard?.id} hotIds={hotIds} onSelect={setSelectedBoard} onMoved={setViewCenter} focusOffsetY={selectedBoard ? 300 : 0} hideControls={Boolean(selectedBoard)}/>
    <div className="map-top-overlay">
      <header><h1>내 주변</h1></header>
      <FilterChips className="map-filters" options={filters} selected={filter} onSelect={selectFilter}/>
    </div>
    {movedFar && !selectedBoard && <button className="map-search-here" onClick={searchHere}><RotateCw size={15}/>이 지역에서 다시 찾기</button>}
    {selectedBoard && <IncidentBottomSheet board={selectedBoard} onClose={() => setSelectedBoard(undefined)} onOpen={() => openBoard(selectedBoard.id)}/>}
  </AppShell>
}
