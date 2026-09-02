import { PostReactions } from './PostReactions'
import type { Board } from '../../types/domain'

export function BoardCard({ board, onOpen, showBody = false }: { board: Board; onOpen: () => void; showBody?: boolean }) {
  return <article className="post-card clickable" onClick={onOpen} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen()}>
    <div className="row"><span className={`badge ${board.category === '긴급 사고' ? 'red' : board.category === '동네 소식' ? 'blue' : 'yellow'}`}>{board.category}</span><small>{board.createdAt} · {board.distance}m</small></div>
    <h3>{board.title}</h3>
    {showBody && <p>{board.body}</p>}
    <PostReactions board={board}/>
    <div className="board-meta"><span>조회 {board.views}</span><span>{board.status}</span></div>
  </article>
}
