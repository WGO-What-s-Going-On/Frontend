import { useRef, useState } from 'react'
import { Clock3, MapPin, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { categoryLabel } from '../../domain/labels'
import type { Board } from '../../types/domain'
import { BoardImage } from '../board/BoardImage'
import { PhotoViewer, ZoomBadge } from '../../components/ui/PhotoViewer'

interface IncidentBottomSheetProps {
  board: Board
  onClose: () => void
  onOpen: () => void
}

export function IncidentBottomSheet({ board, onClose, onOpen }: IncidentBottomSheetProps) {
  // 시트 사진: 사진을 누르면 바로 크게 본다 (사진 밖을 눌러서는 열리지 않게 사진에만 붙인다)
  const [photoOpen, setPhotoOpen] = useState(false)
  const photoOrigin = useRef<HTMLDivElement>(null)
  return <aside className="map-bottom-sheet" aria-label={`${board.title} 요약`}>
    <button className="sheet-handle" onClick={onClose} aria-label="사건 정보 닫기"><span/></button>
    <IconButton className="sheet-close" label="닫기" onClick={onClose}><X size={20}/></IconButton>
    <div className="incident-preview" aria-hidden="true">
      <span className="preview-building preview-building-one"/>
      <span className="preview-building preview-building-two"/>
      <span className="preview-road"/>
      <span className="preview-marker"><MapPin size={20}/></span>
    </div>
    {board.imageUrl ? <div ref={photoOrigin} className="detail-photo-press zoomable" role="button" tabIndex={0} aria-label="사진 크게 보기" onClick={(event) => { event.stopPropagation(); setPhotoOpen(true) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPhotoOpen(true) } }} onContextMenu={(event) => event.preventDefault()}><BoardImage board={board} variant="sheet-image" block/><ZoomBadge/></div> : <BoardImage board={board} variant="sheet-image" block/>}
    {photoOpen && board.imageUrl && <PhotoViewer src={board.imageUrl} alt="현장 사진" origin={photoOrigin} onClose={() => setPhotoOpen(false)}/>}
    <span className="sheet-category" data-category={board.category}>{categoryLabel[board.category]}</span>
    <h2>{board.title}</h2>
    <p>{board.body}</p>
    <div className="sheet-meta"><span><MapPin size={14}/>{board.distance}m 근처</span><span><Clock3 size={14}/>{board.createdAt}</span></div>
    <Button className="sheet-detail" onClick={onOpen}>자세히 보기</Button>
  </aside>
}
