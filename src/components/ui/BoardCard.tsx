import type { ReactNode } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { categoryLabel } from '../../domain/labels'
import { isHotBoard } from '../../types/domain'
import type { Board } from '../../types/domain'

// action: 카드 아래 오른쪽에 붙는 버튼 (예: 최근 활동의 '종료 해제')
export function BoardCard({ board, onOpen, commentCount = 0, showBody = false, notificationsMuted, onToggleNotifications, action }: { board: Board; onOpen: () => void; commentCount?: number; showBody?: boolean; notificationsMuted?: boolean; onToggleNotifications?: () => void; action?: ReactNode }) {
  return <article className={`ux-board-card ${showBody ? 'show-body' : ''} ${onToggleNotifications ? 'has-alert' : ''}`}>
    <button className="ux-board-card-main" onClick={onOpen}>
      <div className="ux-board-card-top"><span data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, commentCount) && <b className="board-tag tag-hot">HOT</b>}{board.status === '종료됨' && <b className="board-tag tag-ended">종료</b>}</div>
      <h3>{board.title}</h3>
      <p>{board.body}</p>
      {(board.imagePlaceholder || board.imageName) && <span className="board-image-placeholder card-image">[이미지]</span>}
      <div className="ux-board-card-bottom"><span>조회 {board.views}</span><span>댓글 {commentCount}</span><small>{board.distance}m · {board.createdAt}</small></div>
    </button>
    {action && <div className="ux-board-card-action">{action}</div>}
    {onToggleNotifications && <button className={`ux-board-alert ${notificationsMuted ? 'muted' : ''}`} onClick={onToggleNotifications} aria-label={notificationsMuted ? `${board.title} 알림 켜기` : `${board.title} 알림 끄기`} title={notificationsMuted ? '알림 켜기' : '알림 끄기'}>{notificationsMuted ? <BellOff size={17}/> : <Bell size={17}/>}</button>}
  </article>
}
