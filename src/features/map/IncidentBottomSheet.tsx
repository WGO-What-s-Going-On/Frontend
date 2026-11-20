import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, MapPin, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { categoryLabel } from '../../domain/labels'
import type { Board } from '../../types/domain'
import { BoardImage } from '../board/BoardImage'
import { PhotoViewer, ZoomBadge } from '../../components/ui/PhotoViewer'

interface IncidentBottomSheetProps {
  board: Board
  // 같은 자리 핀 묶음이면 그 자리 글들 · 몇 번째 글인지 · 넘기기 (‹ 1 / 2 ›, 옆으로 밀어도 넘어간다)
  position?: { boards: Board[]; index: number; go: (index: number) => void }
  onClose: () => void
  onOpen: () => void
}

// 손가락으로 다루는 요약 시트
// - 옆으로 밀기: 글이 손가락을 따라 움직이고, 충분히 밀면 다음 글이 밀려 들어온다 (묶음 핀일 때)
// - 위로 끌기: 시트가 커지며 본문 전체가 보인다. 아래로 끌면 다시 작아지고, 작은 상태에서 더 내리면 닫힌다
// - 사진 말고 글 부분을 누르면 상세로
const AXIS_LOCK = 8
const SWIPE = 50
const EXPAND = 40
const CLOSE = 90

type Turn = { from: number; dir: 1 | -1; offset: number } | null

export function IncidentBottomSheet({ board, position, onClose, onOpen }: IncidentBottomSheetProps) {
  const total = position?.boards.length ?? 1
  const [expanded, setExpanded] = useState(false)
  // 끄는 중: 가로(글 넘기기) · 세로(크기)
  const [drag, setDrag] = useState<{ axis: 'x' | 'y'; dx: number; dy: number } | null>(null)
  // 넘기는 애니메이션: 나가는 글(from) · 방향 · 손을 뗀 위치(거기서 이어서 움직인다)
  const [turn, setTurn] = useState<Turn>(null)
  const [closing, setClosing] = useState(false)
  // 펼친 본문이 길어 안에서 스크롤해야 하면, 그 칸에서는 세로 끌기 대신 스크롤
  const [scrolls, setScrolls] = useState(false)
  const start = useRef<{ x: number; y: number; inBody: boolean; atTop: boolean; id: number } | null>(null)
  // 밀거나 끈 손가락이 버튼 · 글 위에서 떨어져도 눌린 것으로 치지 않는다
  const moved = useRef(false)
  const body = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLElement>(null)
  const before = useRef<number | null>(null)

  // 크기 바꾸기: 바뀌기 전 높이를 재 두고, 바뀐 높이까지 위 가장자리가 부드럽게 오르내린다 (아래 '자세히 보기'는 제자리)
  const resize = (next: boolean) => { before.current = sheet.current?.offsetHeight ?? null; setExpanded(next) }
  useLayoutEffect(() => {
    const el = body.current
    setScrolls(Boolean(expanded && el && el.scrollHeight > el.clientHeight + 1))
    const from = before.current
    before.current = null
    const box = sheet.current
    if (from === null || !box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = box.offsetHeight
    if (from === to) return
    box.style.overflow = 'hidden'
    box.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 300, easing: 'cubic-bezier(.2, .8, .2, 1)' })
      .finished.catch(() => undefined).then(() => { box.style.overflow = '' })
  }, [expanded, board.id])

  const turnTo = (step: 1 | -1, offset = 0) => {
    if (!position) return
    setTurn({ from: position.index, dir: step, offset })
    position.go((position.index + step + total) % total)
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (closing) return
    const inBody = Boolean(body.current?.contains(event.target as Node))
    start.current = { x: event.clientX, y: event.clientY, inBody, atTop: (body.current?.scrollTop ?? 0) <= 0, id: event.pointerId }
    moved.current = false
  }
  const onPointerMove = (event: React.PointerEvent) => {
    const s = start.current
    if (!s || s.id !== event.pointerId) return
    const dx = event.clientX - s.x
    const dy = event.clientY - s.y
    let axis = drag?.axis
    if (!axis) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      // 손가락이 움직였으면 떼도 누른 것이 아니다 (넘길 글이 없어 무시하는 가로 밀기 · 본문 스크롤도)
      moved.current = true
      // 가로는 넘길 글이 있을 때만, 세로는 펼친 본문을 스크롤하는 중이 아닐 때만
      if (axis === 'x' && !position) { start.current = null; return }
      if (axis === 'y' && expanded && scrolls && s.inBody && !(s.atTop && dy > 0)) { start.current = null; return }
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    }
    setDrag({ axis, dx, dy })
  }
  const onPointerUp = () => {
    const d = drag
    start.current = null
    setDrag(null)
    if (!d) return
    if (d.axis === 'x') {
      if (Math.abs(d.dx) > SWIPE) turnTo(d.dx < 0 ? 1 : -1, d.dx)
      return
    }
    if (!expanded && d.dy < -EXPAND) resize(true)
    else if (expanded && d.dy > EXPAND) resize(false)
    // 아래로 빠져나가는 동안 기다렸다 닫는다 (움직임 줄이기 설정이면 바로)
    else if (!expanded && d.dy > CLOSE) { setClosing(true); window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240) }
  }

  // 세로로 끄는 동안 시트가 손가락을 따라온다 (위로는 절반쯤, 아래로는 그대로)
  const lift = drag?.axis === 'y' ? (drag.dy < 0 ? Math.max(drag.dy * 0.5, -140) : drag.dy) : 0
  const slideX = drag?.axis === 'x' ? drag.dx : 0
  const toggle = () => resize(!expanded)

  // 닫힐 때는 아래로 빠져나간 뒤 닫는다
  const shift = closing ? 'translateY(calc(100% + 140px))' : lift ? `translateY(${lift}px)` : undefined
  return <aside ref={sheet} className={`map-bottom-sheet ${position ? 'has-pager' : ''} ${expanded ? 'expanded' : ''} ${drag ? 'dragging' : ''} ${turn ? 'turning' : ''}`} aria-label={`${board.title} 요약`}
    style={shift ? { transform: shift } : undefined}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    onClickCapture={(event) => { if (moved.current) { moved.current = false; event.stopPropagation(); event.preventDefault() } }}>
    <button className="sheet-handle" onClick={toggle} aria-label={expanded ? '요약 작게 보기' : '요약 크게 보기'} aria-expanded={expanded}><span/></button>
    <IconButton className="sheet-close" label="닫기" onClick={onClose}><X size={20}/></IconButton>
    {position && <div className="sheet-pager" aria-label={`이 자리 게시글 ${total}개 중 ${position.index + 1}번째`}>
      <button onClick={() => turnTo(-1)} aria-label="이전 게시글"><ChevronLeft size={16}/></button>
      <span>{position.index + 1} / {total}</span>
      <button onClick={() => turnTo(1)} aria-label="다음 게시글"><ChevronRight size={16}/></button>
    </div>}
    {/* 글 부분을 누르면 상세로 (사진은 크게 보기) */}
    <div ref={body} className={`sheet-body ${scrolls ? 'scrolls' : ''}`} onClick={onOpen}>
      {/* 묶음이면 그 자리 글들을 한 칸에 겹쳐 두고 지금 글만 보인다: 시트 높이가 가장 긴 글에 맞춰 고정돼 넘겨도 출렁이지 않는다 */}
      {position
        ? <div className="sheet-slides" style={slideX ? { transform: `translateX(${slideX}px)` } : undefined}>
          {position.boards.map((item, index) => {
            const active = item.id === board.id
            const leaving = turn && turn.from === index && !active
            return <div key={item.id} className="sheet-slide" aria-hidden={!active || undefined} inert={!active}
              data-active={active} data-enter={active && turn ? (turn.dir > 0 ? 'next' : 'prev') : undefined} data-leave={leaving ? (turn.dir > 0 ? 'next' : 'prev') : undefined}
              style={turn && (active || leaving) ? { '--from': `${turn.offset}px` } as React.CSSProperties : undefined}
              onAnimationEnd={(event) => { if (active && event.target === event.currentTarget) setTurn(null) }}>
              <SheetSummary board={item}/>
            </div>
          })}
        </div>
        : <SheetSummary board={board}/>}
    </div>
    <Button className="sheet-detail" onClick={onOpen}>자세히 보기</Button>
  </aside>
}

const stop = (event: React.SyntheticEvent) => event.stopPropagation()

// 시트 본문: 사진(누르면 크게 보기) · 분류 · 제목 · 내용(작을 때 한 줄, 펼치면 전부) · 거리 · 시간
function SheetSummary({ board }: { board: Board }) {
  const [photoOpen, setPhotoOpen] = useState(false)
  const photoOrigin = useRef<HTMLDivElement>(null)
  return <>
    {board.imageUrl ? <div ref={photoOrigin} className="detail-photo-press zoomable" role="button" tabIndex={0} aria-label="사진 크게 보기" onClick={(event) => { event.stopPropagation(); setPhotoOpen(true) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPhotoOpen(true) } }} onContextMenu={(event) => event.preventDefault()}><BoardImage board={board} variant="sheet-image" block/><ZoomBadge/></div> : <BoardImage board={board} variant="sheet-image" block/>}
    {/* 사진 보기는 화면 맨 위(portal)에 뜨지만 이벤트는 시트로 올라온다: 시트의 끌기 · 상세 열기로 번지지 않게 여기서 막는다 */}
    {photoOpen && board.imageUrl && <span hidden onClick={stop} onPointerDown={stop} onPointerMove={stop} onPointerUp={stop} onPointerCancel={stop}><PhotoViewer src={board.imageUrl} alt="현장 사진" origin={photoOrigin} onClose={() => setPhotoOpen(false)}/></span>}
    <span className="sheet-category" data-category={board.category}>{categoryLabel[board.category]}</span>
    <h2>{board.title}</h2>
    <p>{board.body}</p>
    <div className="sheet-meta"><span><MapPin size={14}/>{board.distance}m 근처</span><span><Clock3 size={14}/>{board.createdAt}</span></div>
  </>
}
