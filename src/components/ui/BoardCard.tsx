import { StatusLine } from './BoardStatus'
import type { Board } from '../../types/domain'

/**
 * 카테고리 배지 · 상태 줄 · 하단 통계로 메타데이터가 세 줄이었다.
 * 제목과 내용을 먼저 읽히게 하고 나머지는 한 줄로 합친다.
 * 게시판별 알림은 상세 화면 헤더에 있으므로 목록에서는 뺀다.
 */
export function BoardCard({ board, onOpen, inRange, commentCount = 0 }: {
  board: Board
  onOpen: () => void
  inRange: boolean
  commentCount?: number
}) {
  return <button className="ux-board-card" onClick={onOpen}>
    <h3>{board.title}</h3>
    <p>{board.body}</p>
    <small><StatusLine board={board} inRange={inRange}/> · {board.createdAt} · 댓글 {commentCount}</small>
  </button>
}
