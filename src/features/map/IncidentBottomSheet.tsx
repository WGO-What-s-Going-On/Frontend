import { Activity, Clock3, MapPin, RefreshCw, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { categoryLabel } from '../../domain/labels'
import type { Board } from '../../types/domain'

interface IncidentBottomSheetProps {
  board: Board
  activity: '활발' | '보통' | '조용'
  updatedAt: string
  onClose: () => void
  onOpen: () => void
}

export function IncidentBottomSheet({ board, activity, updatedAt, onClose, onOpen }: IncidentBottomSheetProps) {
  return <aside className="map-bottom-sheet" aria-label={`${board.title} 요약`}>
    <button className="sheet-handle" onClick={onClose} aria-label="사건 정보 닫기"><span/></button>
    <IconButton className="sheet-close" label="닫기" onClick={onClose}><X size={20}/></IconButton>
    <div className="incident-preview" aria-hidden="true">
      <span className="preview-building preview-building-one"/>
      <span className="preview-building preview-building-two"/>
      <span className="preview-road"/>
      <span className="preview-marker"><MapPin size={20}/></span>
    </div>
    <span className="sheet-category" data-category={board.category}>{categoryLabel[board.category]}</span>
    <h2>{board.title}</h2>
    <p>{board.body}</p>
    <div className="sheet-meta"><span><MapPin size={14}/>{board.distance}m 근처</span><span><Clock3 size={14}/>{board.createdAt}</span></div>
    <div className="sheet-meta sheet-meta-live"><span className={`sheet-activity activity-${activity}`}><Activity size={14}/>활성도 {activity}</span><span><RefreshCw size={13}/>최근 업데이트 {updatedAt}</span></div>
    <Button className="sheet-detail" onClick={onOpen}>자세히 보기</Button>
  </aside>
}
