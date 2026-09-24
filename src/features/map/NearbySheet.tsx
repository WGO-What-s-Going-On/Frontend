import { useEffect, useRef, useState } from 'react'
import { ChevronUp, MessageCircle, PenLine } from 'lucide-react'
import { participationOf, StatusLine } from '../../components/ui/BoardStatus'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Board } from '../../types/domain'
import { SelectedIncidentCard } from './SelectedIncidentCard'

export type Snap = 'peek' | 'list' | 'full'

const HEIGHTS: Record<Snap, number> = { peek: 132, list: 404, full: 688 }
const ORDER: Snap[] = ['peek', 'list', 'full']

function nearestSnap(height: number): Snap {
  return ORDER.reduce((best, snap) => Math.abs(HEIGHTS[snap] - height) < Math.abs(HEIGHTS[best] - height) ? snap : best, 'peek')
}

/**
 * 지도만 있는 화면에서는 핀을 눌러 보기 전까지 주변에 무슨 일이 있는지 알 수 없었고,
 * 같은 데이터를 보는 지도 탭과 게시판 탭이 완전히 분리돼 있었다.
 * 지도 위에 항상 떠 있는 시트를 두어 요약 → 목록 → 상세가 한 화면에서 이어지게 한다.
 */
export function NearbySheet({ boards, commentCounts, inRange, selectedId, onSelect, onOpen, snap, onSnapChange, onCompose, children }: {
  boards: Board[]
  commentCounts: Record<string, number>
  inRange: boolean
  selectedId?: string
  /** 지도 핀에서 고른 항목. 목록에서 같은 항목을 표시하는 데 쓴다. */
  onSelect: (board: Board) => void
  onOpen: (board: Board) => void
  snap: Snap
  onSnapChange: (snap: Snap) => void
  onCompose: () => void
  /** 필터 등 시트 상단에 붙는 조작 영역 */
  children?: React.ReactNode
}) {
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = boards.find((board) => board.id === selectedId)
  const joinable = boards.filter((board) => participationOf(board, inRange).canJoin).length
  const closest = boards.reduce<Board | undefined>((near, board) => !near || board.distance < near.distance ? board : near, undefined)

  // 핀을 고르면 목록에서도 같은 항목이 보이도록 맞춰준다. 지도와 목록이 한 대상을 가리킨다는 걸 드러낸다.
  useEffect(() => {
    if (!selectedId) return
    listRef.current?.querySelector(`[data-board="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const beginDrag = (event: React.PointerEvent) => {
    drag.current = { startY: event.clientY, startHeight: HEIGHTS[snap], moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveDrag = (event: React.PointerEvent) => {
    if (!drag.current) return
    const delta = drag.current.startY - event.clientY
    if (Math.abs(delta) > 5) drag.current.moved = true
    setDragHeight(Math.min(HEIGHTS.full, Math.max(HEIGHTS.peek - 24, drag.current.startHeight + delta)))
  }
  const endDrag = () => {
    if (!drag.current) return
    // 거의 움직이지 않았으면 탭으로 보고 다음 단계로 넘긴다.
    if (!drag.current.moved) onSnapChange(snap === 'full' ? 'peek' : ORDER[ORDER.indexOf(snap) + 1])
    else if (dragHeight !== null) onSnapChange(nearestSnap(dragHeight))
    drag.current = null
    setDragHeight(null)
  }

  const height = dragHeight ?? HEIGHTS[snap]
  return <aside
    className={`nearby-sheet snap-${snap} ${dragHeight !== null ? 'dragging' : ''}`}
    style={{ height }}
    aria-label="주변 게시판 목록"
  >
    <div
      className="nearby-grip"
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="button"
      tabIndex={0}
      aria-expanded={snap !== 'peek'}
      aria-label={snap === 'peek' ? '주변 목록 펼치기' : '주변 목록 접기'}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSnapChange(snap === 'full' ? 'peek' : ORDER[ORDER.indexOf(snap) + 1]) } }}
    >
      <span className="nearby-grip-bar"/>
      <div className="nearby-summary">
        <strong>주변에서 일어나는 일 {boards.length}건</strong>
        <small>{joinable > 0 ? `참여 가능 ${joinable}건` : '지금은 참여 가능한 곳이 없어요'}{closest ? ` · 가장 가까운 곳 ${closest.distance}m` : ''}</small>
      </div>
      <button
        className="nearby-compose"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onCompose}
        aria-label="이 자리에 글쓰기"
      ><PenLine size={16}/>글쓰기</button>
      {snap === 'peek' && <ChevronUp size={18} className="nearby-grip-arrow"/>}
    </div>

    {snap !== 'peek' && <div className="nearby-body">
      {children}
      {selected && <SelectedIncidentCard
        board={selected}
        commentCount={commentCounts[selected.id] ?? 0}
        inRange={inRange}
        onClose={() => onSelect(selected)}
        onOpen={() => onOpen(selected)}
      />}
      <div className="nearby-list" ref={listRef}>
        {boards.length ? boards.map((board) => <button
          key={board.id}
          data-board={board.id}
          className={`nearby-row ${selectedId === board.id ? 'selected' : ''}`}
          onClick={() => onOpen(board)}
        >
          <span className="nearby-row-main">
            <b>{board.title}</b>
            <StatusLine board={board} inRange={inRange}/>
          </span>
          <span className="nearby-row-count"><MessageCircle size={13}/>{commentCounts[board.id] ?? 0}</span>
        </button>) : <EmptyState title="이 조건에 맞는 곳이 없어요" description="필터를 바꾸면 주변의 다른 상황을 볼 수 있어요."/>}
      </div>
    </div>}
  </aside>
}
