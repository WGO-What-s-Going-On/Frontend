import type { Board } from '../../types/domain'

export function BoardCard({ board, onOpen, commentCount = 0, showBody = false }: { board: Board; onOpen: () => void; commentCount?: number; showBody?: boolean }) {
  const reactions = Object.values(board.reactions).reduce((total, count) => total + count, 0)
  return <article className={`ux-board-card ${showBody ? 'show-body' : ''}`}>
    <button className="ux-board-card-main" onClick={onOpen}>
      <div className="ux-board-card-top"><span>{board.category}</span><small>{board.distance}m · {board.createdAt}</small></div>
      <h3>{board.title}</h3>
      <p>{board.body}</p>
      <div className="ux-board-card-bottom"><span>조회 {board.views}</span><span>공감 {reactions}</span><span>댓글 {commentCount}</span></div>
    </button>
  </article>
}
