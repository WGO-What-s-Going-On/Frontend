import { Bell, BellOff, ChevronRight, MessageCircle } from 'lucide-react'
import { StatusLine } from './BoardStatus'
import type { Board } from '../../types/domain'

/**
 * 기존 카드는 카테고리 → 거리·시간 → 제목 → 본문 → 공감·댓글·조회 순이었다.
 * 상태(실시간/종료됨)가 어디에도 없어 들어가 보기 전에는 참여 가능한지 알 수 없었고,
 * 행동 결정과 거의 무관한 조회수가 댓글 수와 같은 비중을 차지했다.
 * 제목 → 참여 가능 여부 → 대화량 순으로 다시 세운다.
 */
export function BoardCard({ board, onOpen, inRange, commentCount = 0, showBody = false, notificationsMuted, onToggleNotifications }: {
  board: Board
  onOpen: () => void
  inRange: boolean
  commentCount?: number
  showBody?: boolean
  notificationsMuted?: boolean
  onToggleNotifications?: () => void
}) {
  const reactions = Object.values(board.reactions).reduce((total, count) => total + count, 0)
  return <article className={`ux-board-card ${showBody ? 'show-body' : ''} ${onToggleNotifications ? 'has-alert' : ''}`}>
    <button className="ux-board-card-main" onClick={onOpen}>
      <div className="ux-board-card-top"><span>{board.category}</span><small>{board.createdAt}</small></div>
      <h3>{board.title}</h3>
      <StatusLine board={board} inRange={inRange}/>
      <p>{board.body}</p>
      <div className="ux-board-card-bottom"><span><MessageCircle size={14}/>댓글 {commentCount}</span><span>공감 {reactions}</span><ChevronRight size={18}/></div>
    </button>
    {onToggleNotifications && <button
      className={`ux-board-alert ${notificationsMuted ? 'muted' : ''}`}
      onClick={onToggleNotifications}
      aria-label={notificationsMuted ? `${board.title} 알림 켜기` : `${board.title} 알림 끄기`}
      title={notificationsMuted ? '알림 켜기' : '알림 끄기'}
    >{notificationsMuted ? <BellOff size={17}/> : <Bell size={17}/>}</button>}
  </article>
}
