import { ChevronRight, MessageCircle } from 'lucide-react'
import type { Board } from '../../types/domain'

export function BoardCard({ board, onOpen, commentCount = 0, showBody = false }: { board: Board; onOpen: () => void; commentCount?: number; showBody?: boolean }) {
  const reactions = Object.values(board.reactions).reduce((total, count) => total + count, 0)
  return <button className={`ux-board-card ${showBody ? 'show-body' : ''}`} onClick={onOpen}>
    <div className="ux-board-card-top"><span>{board.category}</span><small>{board.distance}m · {board.createdAt}</small></div>
    <h3>{board.title}</h3>
    <p>{board.body}</p>
    <div className="ux-board-card-bottom"><span>공감 {reactions}</span><span><MessageCircle size={14}/>댓글 {commentCount}</span><span>조회 {board.views}</span><ChevronRight size={18}/></div>
  </button>
}
