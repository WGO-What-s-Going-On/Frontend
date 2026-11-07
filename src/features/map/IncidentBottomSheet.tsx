import { useRef, useState } from 'react'
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

export function IncidentBottomSheet({ board, position, onClose, onOpen }: IncidentBottomSheetProps) {
  const swipe = useRef<{ x: number; y: number } | null>(null)
  // 밀어서 넘긴 손가락이 버튼 위에서 떨어져도 그 버튼(자세히 보기 등)이 눌리지 않게
  const swiped = useRef(false)
  const total = position?.boards.length ?? 1
  const go = (step: number) => { if (position) position.go((position.index + step + total) % total) }
  return <aside className={`map-bottom-sheet ${position ? 'has-pager' : ''}`} aria-label={`${board.title} 요약`}
    onPointerDown={(event) => { swipe.current = { x: event.clientX, y: event.clientY } }}
    onPointerUp={(event) => {
      const start = swipe.current
      swipe.current = null
      if (!start || !position) return
      const dx = event.clientX - start.x
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.5) { swiped.current = true; go(dx < 0 ? 1 : -1) }
    }}
    onClickCapture={(event) => { if (swiped.current) { swiped.current = false; event.stopPropagation(); event.preventDefault() } }}>
    <button className="sheet-handle" onClick={onClose} aria-label="사건 정보 닫기"><span/></button>
    <IconButton className="sheet-close" label="닫기" onClick={onClose}><X size={20}/></IconButton>
    {position && <div className="sheet-pager" aria-label={`이 자리 게시글 ${total}개 중 ${position.index + 1}번째`}>
      <button onClick={() => go(-1)} aria-label="이전 게시글"><ChevronLeft size={16}/></button>
      <span>{position.index + 1} / {total}</span>
      <button onClick={() => go(1)} aria-label="다음 게시글"><ChevronRight size={16}/></button>
    </div>}
    <div className="incident-preview" aria-hidden="true">
      <span className="preview-building preview-building-one"/>
      <span className="preview-building preview-building-two"/>
      <span className="preview-road"/>
      <span className="preview-marker"><MapPin size={20}/></span>
    </div>
    {/* 묶음이면 그 자리 글들을 한 칸에 겹쳐 두고 지금 글만 보인다: 시트 높이가 가장 긴 글에 맞춰 고정돼 넘겨도 출렁이지 않는다 */}
    {position
      ? <div className="sheet-slides">{position.boards.map((item) => <div key={item.id} className="sheet-slide" aria-hidden={item.id !== board.id || undefined} inert={item.id !== board.id} data-active={item.id === board.id}><SheetSummary board={item}/></div>)}</div>
      : <SheetSummary board={board}/>}
    <Button className="sheet-detail" onClick={onOpen}>자세히 보기</Button>
  </aside>
}

// 시트 본문: 사진(누르면 크게 보기) · 분류 · 제목 · 내용 한 줄 · 거리 · 시간
function SheetSummary({ board }: { board: Board }) {
  // 사진 밖을 눌러서는 열리지 않게 사진에만 붙인다
  const [photoOpen, setPhotoOpen] = useState(false)
  const photoOrigin = useRef<HTMLDivElement>(null)
  return <>
    {board.imageUrl ? <div ref={photoOrigin} className="detail-photo-press zoomable" role="button" tabIndex={0} aria-label="사진 크게 보기" onClick={(event) => { event.stopPropagation(); setPhotoOpen(true) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPhotoOpen(true) } }} onContextMenu={(event) => event.preventDefault()}><BoardImage board={board} variant="sheet-image" block/><ZoomBadge/></div> : <BoardImage board={board} variant="sheet-image" block/>}
    {photoOpen && board.imageUrl && <PhotoViewer src={board.imageUrl} alt="현장 사진" origin={photoOrigin} onClose={() => setPhotoOpen(false)}/>}
    <span className="sheet-category" data-category={board.category}>{categoryLabel[board.category]}</span>
    <h2>{board.title}</h2>
    <p>{board.body}</p>
    <div className="sheet-meta"><span><MapPin size={14}/>{board.distance}m 근처</span><span><Clock3 size={14}/>{board.createdAt}</span></div>
  </>
}
