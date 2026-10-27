import { MessageCircle } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { NoticeBell } from '../../components/ui/NoticeBell'
import { reactionOptions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import { categoryLabel, reactionLabel } from '../../domain/labels'
import { isHotBoard, myReactions } from '../../types/domain'
import type { Board, Comment } from '../../types/domain'
import { minutesSince, voteStatus } from '../board/commentVote'
import { RADIUS } from '../map/mapWorld'

// 피드: 진행 중인 주변 게시글을 최신순으로 펼쳐 본다. 글을 열지 않아도 본문 · 사진 · 반응 · 댓글 수가 보이고,
// 150m 안 글에는 바로 반응을 남길 수 있다. 카드를 누르면 상세로
function FeedItem({ board, comments }: { board: Board; comments: Comment[] }) {
  const { inRange, openBoard, reactToBoard } = useApp()
  const canReact = inRange && board.distance <= RADIUS
  const voting = voteStatus(board, comments) === 'OPEN'
  const open = () => openBoard(board.id)
  return <article className="feed-item">
    <button className="feed-main" onClick={open}>
      <span className="feed-meta"><span className="feed-category" data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, comments.length) && <b className="board-tag tag-hot">HOT</b>}<small>{board.createdAt}</small></span>
      <strong className="feed-title">{board.title}</strong>
      <span className="feed-body">{board.body}</span>
      {(board.imagePlaceholder || board.imageName) && <span className="board-image-placeholder feed-image">[이미지]</span>}
    </button>
    {/* 인스타처럼 한 줄: 아이콘 + 숫자만. 반응 이름은 길게 누르거나 상세에서 본다. 내가 누른 반응만 파랑 */}
    <div className="feed-actions">
      {reactionOptions.map(({ label, icon: Icon }) => {
        const pressed = myReactions(board).includes(label)
        return <button key={label} className={pressed ? 'selected' : ''} disabled={!canReact} aria-pressed={pressed} aria-label={`${reactionLabel[label].full} ${board.reactions[label]}`} title={reactionLabel[label].full} onClick={() => reactToBoard(board.id, label)}><Icon size={21} strokeWidth={1.8}/><span>{board.reactions[label]}</span></button>
      })}
      <button onClick={open} aria-label={`댓글 ${comments.length}개`}><MessageCircle size={21} strokeWidth={1.8}/><span>{comments.length}</span></button>
      {voting && <em>댓글 투표 중</em>}
    </div>
  </article>
}

export function FeedScreen() {
  const { boards, comments, blockedUsers } = useApp()
  const live = boards
    .filter((board) => board.status === '실시간')
    .sort((a, b) => minutesSince(a.createdAt) - minutesSince(b.createdAt) || a.distance - b.distance)
  const commentsOf = (id: string) => comments.filter((comment) => comment.boardId === id && !blockedUsers.includes(comment.authorId))
  return <AppShell contentClassName="ux-board-screen feed-screen">
    <header className="ux-board-header"><h1>피드</h1><NoticeBell/></header>
    <div className="feed-list">{live.map((board) => <FeedItem key={board.id} board={board} comments={commentsOf(board.id)}/>)}</div>
  </AppShell>
}
