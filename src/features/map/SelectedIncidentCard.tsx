import { ChevronRight, MessageCircle, X } from 'lucide-react'
import { StatusLine } from '../../components/ui/BoardStatus'
import type { Board } from '../../types/domain'

/**
 * 핀을 고르면 뜨던 요약 시트를 목록 시트 안의 선택 카드로 옮겼다.
 * 자리를 차지하던 가짜 건물 일러스트 대신, 들어갈지 판단할 근거(상태·참여 가능 여부·반응·댓글 수)를 보여준다.
 */
export function SelectedIncidentCard({ board, commentCount, inRange, onClose, onOpen }: {
  board: Board
  commentCount: number
  inRange: boolean
  onClose: () => void
  onOpen: () => void
}) {
  const reactions = Object.values(board.reactions).reduce((total, count) => total + count, 0)
  return <article className="selected-incident" aria-label={`${board.title} 요약`}>
    <div className="selected-incident-head">
      <span className="selected-incident-category">{board.category}</span>
      <button onClick={onClose} aria-label="선택 해제"><X size={17}/></button>
    </div>
    <h3>{board.title}</h3>
    <StatusLine board={board} inRange={inRange}/>
    <p className="selected-incident-body">{board.body}</p>
    <div className="selected-incident-meta"><span>공감 {reactions}</span><span><MessageCircle size={13}/>댓글 {commentCount}</span></div>
    <button className="selected-incident-open" onClick={onOpen}>{board.status === '종료됨' ? '기록 보기' : '들어가서 상황 보기'}<ChevronRight size={17}/></button>
  </article>
}
