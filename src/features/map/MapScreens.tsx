import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Heart, ImageOff, Lock, MapPin, MapPinOff, MessageCircleOff, RotateCw, SmilePlus } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { FilterChips } from '../../components/ui/FilterChips'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import { categoryLabel } from '../../domain/labels'
import type { Board } from '../../types/domain'
import { IncidentBottomSheet } from './IncidentBottomSheet'
import { MapView } from './MapView'
import { ME, RADIUS, boardPosition, type Point } from './mapWorld'

type MapFilter = '전체' | '긴급/사고' | '도움요청' | 'HOT'

const filters: MapFilter[] = ['전체', '긴급/사고', '도움요청', 'HOT']

// HOT: 조회수나 댓글이 많이 몰린 진행 중 게시판 (실제 기준은 백엔드 활성도 점수)
function isHot(board: Board, commentCount: number) {
  return board.status === '실시간' && (board.views >= 100 || commentCount >= 5)
}

function filterBoards(boards: Board[], filter: MapFilter, hotIds: Set<string>) {
  // 종료·숨김 게시판은 지도에서 뺀다
  const visible = boards.filter((board) => board.status === '실시간')
  if (filter === '긴급/사고') return visible.filter((board) => board.category === '긴급 사고')
  if (filter === '도움요청') return visible.filter((board) => board.category === '도움 요청')
  if (filter === 'HOT') return visible.filter((board) => hotIds.has(board.id))
  return visible
}

export function MapScreen() {
  const { boards, comments, openBoard, showToast } = useApp()
  const [filter, setFilter] = useState<MapFilter>('전체')
  const [selectedBoard, setSelectedBoard] = useState<Board>()
  // 다른 화면에서 '지도에서 위치 보기'로 들어오면 그 게시판 핀을 고른 상태로 연다
  useEffect(() => {
    const focusId = sessionStorage.getItem('wgo-map-focus')
    if (!focusId) return
    sessionStorage.removeItem('wgo-map-focus')
    const target = boards.find((board) => board.id === focusId)
    if (target) setSelectedBoard(target)
  }, [])
  const [searchCenter, setSearchCenter] = useState<Point>(ME)
  const [viewCenter, setViewCenter] = useState<Point>(ME)
  const hotIds = useMemo(() => new Set(boards.filter((board) => isHot(board, comments.filter((comment) => comment.boardId === board.id).length)).map((board) => board.id)), [boards, comments])
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
      <header><h1>내 주변 지도</h1></header>
      <FilterChips className="map-filters" options={filters} selected={filter} onSelect={selectFilter}/>
    </div>
    {movedFar && !selectedBoard && <button className="map-search-here" onClick={searchHere}><RotateCw size={15}/>이 지역에서 다시 찾기</button>}
    {selectedBoard && <IncidentBottomSheet board={selectedBoard} onClose={() => setSelectedBoard(undefined)} onOpen={() => openBoard(selectedBoard.id)}/>}
  </AppShell>
}

// 150m 밖에서 연 게시판 (MAP-F05): 읽기만 가능. 왜 참여할 수 없는지, 얼마나 가까이 가야 하는지 보여준다.
export function OutsideRangeScreen() {
  const { currentBoard: board, comments, blockedUsers, locationPermission, back, go } = useApp()
  const [showAll, setShowAll] = useState(false)
  if (!board) return null
  const boardComments = comments.filter((comment) => comment.boardId === board.id && !comment.parentId && !blockedUsers.includes(comment.authorId))
  const replyCount = (id: string) => comments.filter((comment) => comment.parentId === id).length
  const shown = showAll ? boardComments : boardComments.slice(0, 3)
  const permissionOff = board.distance <= RADIUS && locationPermission !== 'granted'
  const headline = permissionOff ? '위치 권한이 꺼져 있어요' : '참여 범위 밖 게시판이에요'
  const showOnMap = () => { sessionStorage.setItem('wgo-map-focus', board.id); go('home') }
  return <AppShell nav={false} contentClassName="outside-screen" bottomContent={<div className="outside-bottom"><div className="outside-readonly-bar"><Lock size={16}/><span>150m 안에서만 댓글 가능</span></div><Button className="outside-map-button" onClick={showOnMap}><MapPin size={16}/>위치 보기</Button></div>}>
    <header className="detail-nav"><IconButton className="icon" label="뒤로 가기" onClick={() => back('home')}><ArrowLeft size={22}/></IconButton></header>

    <section className="outside-range" aria-label="참여 범위 안내">
      <div className="outside-range-head"><span className="outside-range-icon"><MapPinOff size={18}/></span><div><strong>{headline}</strong><p>{permissionOff ? '위치를 확인할 수 없어 지금은 읽기만 할 수 있어요.' : '반경 150m 밖에 있는 게시판은 읽기만 할 수 있어요.'}</p></div></div>
      <ul className="outside-limits" aria-label="할 수 없는 것">
        <li><MessageCircleOff size={15}/>댓글</li>
        <li><SmilePlus size={15}/>반응</li>
        <li><ImageOff size={15}/>사진</li>
      </ul>
      {permissionOff && <button className="outside-permission" onClick={() => go('location-permission')}>위치 권한 켜기</button>}
    </section>

    <article className="outside-article">
      <span className="outside-category" data-category={board.category}>{categoryLabel[board.category]}</span>
      <h1>{board.title}</h1>
      <div className="detail-byline"><strong>{board.authorName}</strong><span>{board.createdAt}</span><span><MapPin size={12}/>{board.distance}m</span></div>
      <p className="detail-body">{board.body}</p>
      <div className="outside-reactions"><PostReactions board={board} fullLabels/></div>
    </article>

    <section className="outside-comments">
      <h3>댓글 <span>{boardComments.length}</span></h3>
      {shown.length ? <ul>{shown.map((comment) => <li key={comment.id}>
        <div className="outside-comment-head"><strong>{comment.authorName}</strong><small>{comment.createdAt}</small></div>
        <p>{comment.body}</p>
        <div className="outside-comment-meta"><span><Heart size={13}/>{comment.likes ?? 0}</span>{replyCount(comment.id) > 0 && <span>답글 {replyCount(comment.id)}</span>}</div>
      </li>)}</ul> : <p className="outside-empty">아직 댓글이 없어요.</p>}
      {boardComments.length > 3 && <button className="comments-more" onClick={() => setShowAll(!showAll)}>{showAll ? '접기' : `댓글 ${boardComments.length - 3}개 더 보기`}</button>}
    </section>
  </AppShell>
}
