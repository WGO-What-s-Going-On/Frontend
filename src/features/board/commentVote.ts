import type { Board, Comment, VoteCandidate } from '../../types/domain'

// 댓글 후보 투표 (백엔드 contracts/comment-vote.md 규칙)
// 글 작성 30분 뒤 공감(도움돼요 + 맞아요)이 많은 댓글 2개를 후보로 고정하고, 게시판이 끝나면 투표도 닫는다.
export const VOTE_OPENS_AFTER = 30
export type VoteStatus = 'PENDING' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'NONE'

// 목업 작성 시각은 '방금 전', 'N분 전', 'N시간 전', '어제', 'N일 전' 같은 글이라 분으로 바꿔 쓴다
export function minutesSince(createdAt: string) {
  const amount = Number(createdAt.match(/\d+/)?.[0] ?? 0)
  if (createdAt.includes('시간')) return amount * 60
  if (createdAt === '어제') return 24 * 60
  if (createdAt.includes('일')) return amount * 24 * 60
  return amount
}

export const voteScore = (comment: Comment) => comment.reactions['도움돼요'] + comment.reactions['맞아요']

// 후보: 점수 높은 순 → 먼저 쓴 순 → id 순으로 2개 (댓글이 2개 미만이면 투표 없음)
export function pickCandidates(comments: Comment[]): VoteCandidate[] {
  if (comments.length < 2) return []
  return [...comments]
    .sort((a, b) => voteScore(b) - voteScore(a) || minutesSince(b.createdAt) - minutesSince(a.createdAt) || a.id.localeCompare(b.id))
    .slice(0, 2)
    // 목업: 이미 다른 사람들이 투표한 것처럼 공감 수에 비례한 표를 넣어 둔다
    .map((comment) => ({ commentId: comment.id, content: comment.body || '[사진]', votes: Math.round(voteScore(comment) / 5) }))
}

export function voteStatus(board: Board, comments: Comment[]): VoteStatus {
  const live = board.status === '실시간'
  if (!board.vote) {
    if (minutesSince(board.createdAt) < VOTE_OPENS_AFTER) return live ? 'PENDING' : 'NONE'
    // 후보 고를 때가 됐지만 아직 안 골랐으면 상세 화면이 열 때 고른다
    return live && comments.length >= 2 ? 'OPEN' : 'NONE'
  }
  if (board.vote.candidates.length < 2) return 'NONE'
  if (board.vote.cancelled) return 'CANCELLED'
  return live ? 'OPEN' : 'CLOSED'
}

// 승자: 1표 이상 받은 단독 1위만. 0표거나 동점이면 없음
export function voteWinner(candidates: VoteCandidate[]) {
  const [first, second] = [...candidates].sort((a, b) => b.votes - a.votes)
  return first && first.votes > 0 && first.votes !== second?.votes ? first : null
}
