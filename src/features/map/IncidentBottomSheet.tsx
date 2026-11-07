import { useRef, useState } from 'react'
import { Clock3, MapPin, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { categoryLabel } from '../../domain/labels'
import type { Board } from '../../types/domain'
import { BoardImage } from '../board/BoardImage'
import { PhotoViewer, useLongPress } from '../../components/ui/PhotoViewer'

interface IncidentBottomSheetProps {
  board: Board
  onClose: () => void
  onOpen: () => void
}

export function IncidentBottomSheet({ board, onClose, onOpen }: IncidentBottomSheetProps) {
  // 시트 사진: 누르면 지도 시트 탭과 헷갈리지 않게 꾹 눌러야 크게 본다
  const [photoOpen, setPhotoOpen] = useState(false)
  const photoOrigin = useRef<HTMLDivElement>(null)
  const photoPress = useLongPress(() => setPhotoOpen(true))
  return <aside className="map-bottom-sheet" aria-label={`${board.title} 요약`}>
    <button className="sheet-handle" onClick={onClose} aria-label="사건 정보 닫기"><span/></button>
    <IconButton className="sheet-close" label="닫기" onClick={onClose}><X size={20}/></IconButton>
    <div className="incident-preview" aria-hidden="true">
      <span className="preview-building preview-building-one"/>
      <span className="preview-building preview-building-two"/>
      <span className="preview-road"/>
      <span className="preview-marker"><MapPin size={20}/></span>
    </div>
    {board.imageUrl ? <div ref={photoOrigin} className="detail-photo-press" {...photoPress}><BoardImage board={board} variant="sheet-image" block/></div> : <BoardImage board={board} variant="sheet-image" block/>}
    {photoOpen && board.imageUrl && <PhotoViewer src={board.imageUrl} alt="현장 사진" origin={photoOrigin} onClose={() => setPhotoOpen(false)}/>}
    <span className="sheet-category" data-category={board.category}>{categoryLabel[board.category]}</span>
    <h2>{board.title}</h2>
    <p>{board.body}</p>
    <div className="sheet-meta"><span><MapPin size={14}/>{board.distance}m 근처</span><span><Clock3 size={14}/>{board.createdAt}</span></div>
    <Button className="sheet-detail" onClick={onOpen}>자세히 보기</Button>
  </aside>
}
