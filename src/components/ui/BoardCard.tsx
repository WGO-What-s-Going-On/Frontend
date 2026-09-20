import { Bell, BellRing, ChevronRight, MessageCircle } from 'lucide-react'
import type { Board } from '../../types/domain'

export function BoardCard({ board, onOpen, commentCount = 0, showBody = false, notificationsEnabled, onToggleNotifications }: { board: Board; onOpen: () => void; commentCount?: number; showBody?: boolean; notificationsEnabled?: boolean; onToggleNotifications?: () => void }) {
  const reactions = Object.values(board.reactions).reduce((total, count) => total + count, 0)
  return <article className={`ux-board-card ${showBody ? 'show-body' : ''} ${onToggleNotifications ? 'has-alert' : ''}`}>
    <button className="ux-board-card-main" onClick={onOpen}>
      <div className="ux-board-card-top"><span>{board.category}</span><small>{board.distance}m · {board.createdAt}</small></div>
      <h3>{board.title}</h3>
      <p>{board.body}</p>
      <div className="ux-board-card-bottom"><span>공감 {reactions}</span><span><MessageCircle size={14}/>댓글 {commentCount}</span><span>조회 {board.views}</span><ChevronRight size={18}/></div>
    </button>
    {onToggleNotifications && <button className={`ux-board-alert ${notificationsEnabled ? 'selected' : ''}`} onClick={onToggleNotifications} aria-label={notificationsEnabled ? `${board.title} 알림 끄기` : `${board.title} 알림 받기`} title={notificationsEnabled ? '알림 끄기' : '알림 받기'}>{notificationsEnabled ? <BellRing size={17}/> : <Bell size={17}/>}</button>}
  </article>
}
