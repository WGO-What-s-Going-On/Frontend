import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { StatusLine } from '../../components/ui/BoardStatus'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Board } from '../../types/domain'

const PEEK = 58
const OPEN = 452

/**
 * 지도만 있으면 핀을 눌러 보기 전까지 주변에 무슨 일이 있는지 알 수 없다.
 * 목록을 항상 띄워 두되, 접기/펼치기 두 단계만 둔다.
 */
export function NearbySheet({ boards, commentCounts, inRange, onOpen }: {
  boards: Board[]
  commentCounts: Record<string, number>
  inRange: boolean
  onOpen: (board: Board) => void
}) {
  const [open, setOpen] = useState(true)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)

  const beginDrag = (event: React.PointerEvent) => {
    drag.current = { startY: event.clientY, startHeight: open ? OPEN : PEEK, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveDrag = (event: React.PointerEvent) => {
    if (!drag.current) return
    const delta = drag.current.startY - event.clientY
    if (Math.abs(delta) > 5) drag.current.moved = true
    setDragHeight(Math.min(OPEN, Math.max(PEEK, drag.current.startHeight + delta)))
  }
  const endDrag = () => {
    if (!drag.current) return
    if (!drag.current.moved) setOpen((value) => !value)
    else if (dragHeight !== null) setOpen(dragHeight > (PEEK + OPEN) / 2)
    drag.current = null
    setDragHeight(null)
  }

  return <aside className={`nearby-sheet ${dragHeight !== null ? 'dragging' : ''}`} style={{ height: dragHeight ?? (open ? OPEN : PEEK) }}>
    <button
      className="nearby-grip"
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-expanded={open}
    >
      주변 {boards.length}건
      {open ? <ChevronDown size={17}/> : <ChevronUp size={17}/>}
    </button>

    {open && <div className="nearby-body">
      <div className="nearby-list">
        {boards.length ? boards.map((board) => <button key={board.id} className="nearby-row" onClick={() => onOpen(board)}>
          <b>{board.title}</b>
          <small><StatusLine board={board} inRange={inRange}/> · 댓글 {commentCounts[board.id] ?? 0}</small>
        </button>) : <EmptyState title="이 조건에 맞는 곳이 없어요"/>}
      </div>
    </div>}
  </aside>
}
