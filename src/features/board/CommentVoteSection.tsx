import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Board } from '../../types/domain'
import { voteStatus, voteWinner } from './commentVote'

// 댓글 투표: 공감 많은 댓글 2개 중 더 맞는 쪽을 고른다. 다른 후보를 누르면 표를 옮기고, 내 후보를 다시 누르면 취소.
// 고르기·옮기기는 150m 안에서만, 취소는 범위 밖에서도 된다 (백엔드: PUT은 위치 확인, DELETE는 확인 없음)
export function CommentVoteSection({ board, canChoose }: { board: Board; canChoose: boolean }) {
  const { comments, startVote, castVote } = useApp()
  const boardComments = comments.filter((comment) => comment.boardId === board.id)
  const status = voteStatus(board, boardComments)
  const needsCandidates = status === 'OPEN' && !board.vote
  useEffect(() => { if (needsCandidates) startVote(board.id) }, [needsCandidates, board.id, startVote])

  // 열리기 전에는 아무것도 보여주지 않는다: 여는 조건(댓글 수 · 조회수 · 공감 비율)은 백엔드가 판단해서 남은 시간을 약속할 수 없다
  if (status === 'NONE' || status === 'PENDING' || needsCandidates) return null

  const vote = board.vote!
  const total = vote.candidates.reduce((sum, candidate) => sum + candidate.votes, 0)
  const winner = voteWinner(vote.candidates)
  const meta = status === 'CANCELLED' ? '취소됨' : status === 'OPEN' ? `${total}명 참여` : winner ? `투표 종료 · ${total}명` : total ? '동점 · 결과 없음' : '참여 없이 종료'
  return <section className="comment-vote" aria-label="댓글 투표">
    <div className="comment-vote-head"><h3>댓글 투표</h3><span>{meta}</span></div>
    {status === 'CANCELLED' ? <p className="comment-vote-note">후보 댓글이 삭제돼 투표가 취소됐어요</p> : <div className="comment-vote-options">{vote.candidates.map((candidate) => {
      const mine = vote.mine === candidate.commentId
      const won = status === 'CLOSED' && winner?.commentId === candidate.commentId
      return <button key={candidate.commentId} className={`comment-vote-option ${mine ? 'mine' : ''} ${won ? 'won' : ''}`} aria-pressed={mine} disabled={status !== 'OPEN' || (!canChoose && !mine)} onClick={() => castVote(board.id, candidate.commentId)}>
        <span className="comment-vote-bar" style={{ width: `${total ? candidate.votes / total * 100 : 0}%` }} aria-hidden="true"/>
        {won && <b className="comment-vote-won">최다</b>}
        <span className="comment-vote-text">{candidate.content}</span>
        <span className="comment-vote-count">{mine && <Check size={14} strokeWidth={2.6}/>}{candidate.votes}표</span>
      </button>
    })}</div>}
  </section>
}
