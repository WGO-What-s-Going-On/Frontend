import { Bell, BellOff } from 'lucide-react'
import { categoryLabel } from '../../domain/labels'
import { isHotBoard, isOpenBoard } from '../../types/domain'
import type { Board } from '../../types/domain'

export function BoardCard({ board, onOpen, commentCount = 0, showBody = false, notificationsMuted, onToggleNotifications }: { board: Board; onOpen: () => void; commentCount?: number; showBody?: boolean; notificationsMuted?: boolean; onToggleNotifications?: () => void }) {
  return <article className={`ux-board-card ${showBody ? 'show-body' : ''} ${onToggleNotifications ? 'has-alert' : ''}`}>
    <button className="ux-board-card-main" onClick={onOpen}>
      <div className="ux-board-card-top"><span data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, commentCount) && <b className="board-tag tag-hot">HOT</b>}{!isOpenBoard(board) && <b className="board-tag tag-closed">{board.status === '해결됨' ? '해결됨' : '종료'}</b>}</div>
      <h3>{board.title}</h3>
      <p>{board.body}</p>
      <div className="ux-board-card-bottom"><span>조회 {board.views}</span><span>댓글 {commentCount}</span><small>{board.distance}m · {board.createdAt}</small></div>
    </button>
    {onToggleNotifications && <button className={`ux-board-alert ${notificationsMuted ? 'muted' : ''}`} onClick={onToggleNotifications} aria-label={notificationsMuted ? `${board.title} 알림 켜기` : `${board.title} 알림 끄기`} title={notificationsMuted ? '알림 켜기' : '알림 끄기'}>{notificationsMuted ? <BellOff size={17}/> : <Bell size={17}/>}</button>}
  </article>
}
