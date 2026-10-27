import { MessageCircle } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { NoticeBell } from '../../components/ui/NoticeBell'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import { categoryLabel } from '../../domain/labels'
import { isHotBoard } from '../../types/domain'
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
    <div className="feed-reactions"><PostReactions board={board} interactive={canReact} onReact={(reaction) => reactToBoard(board.id, reaction)}/></div>
    <button className="feed-footer" onClick={open}><MessageCircle size={14}/>댓글 {comments.length}개{voting && <em>댓글 투표 중</em>}</button>
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
