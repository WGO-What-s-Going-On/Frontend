import { Clock3, MapPin, X } from 'lucide-react'
import type { Board } from '../../types/domain'

interface IncidentBottomSheetProps {
  board: Board
  onClose: () => void
  onOpen: () => void
}

export function IncidentBottomSheet({ board, onClose, onOpen }: IncidentBottomSheetProps) {
  return <aside className="map-bottom-sheet" aria-label={`${board.title} 요약`}>
    <button className="sheet-handle" onClick={onClose} aria-label="사건 정보 닫기"><span/></button>
    <button className="sheet-close" onClick={onClose} aria-label="닫기"><X size={20}/></button>
    <div className="incident-preview" aria-hidden="true">
      <span className="preview-building preview-building-one"/>
      <span className="preview-building preview-building-two"/>
      <span className="preview-road"/>
      <span className="preview-marker"><MapPin size={20}/></span>
    </div>
    <span className="sheet-category">{board.category}</span>
    <h2>{board.title}</h2>
    <p>{board.body}</p>
    <div className="sheet-meta"><span><MapPin size={14}/>{board.distance}m 근처</span><span><Clock3 size={14}/>{board.createdAt}</span></div>
    <button className="sheet-detail" onClick={onOpen}>자세히 보기</button>
  </aside>
}
