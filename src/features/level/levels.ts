import { myCommentReactions, myReactions } from '../../types/domain'
import type { Board, Comment } from '../../types/domain'
import { voteWinner } from '../board/commentVote'

// 칭호 4단계: 소식통 → 리포터 → 특파원 → 천리안. 단계마다 올라가는 조건이 다르다.
// 실제 집계는 백엔드가 하고, 목업은 지금 저장된 게시판·댓글에서 셈한다.
export interface LevelStats {
  // 게시판 참여: 글쓰기 · 댓글 · 반응 · 투표 (각 1회)
  participation: number
  // 내 댓글이 받은 '맞아요'
  agreeReceived: number
  // 투표로 대표 의견이 된 내 댓글 수
  picks: number
}

// 대표 의견 1회 점수
export const PICK_SCORE = 10

export interface Level {
  name: string
  tagline: string
  // 이 칭호를 얻는 조건 (단계 목록에 보여준다)
  condition: string
  // 다음 칭호로 가는 목표. 마지막 단계(천리안)는 없음
  goal?: { stat: 'participation' | 'agreeReceived' | 'score'; target: number; unit: string; hint?: string }
}

export const levels: Level[] = [
  { name: '소식통', tagline: '동네 소식에 귀를 여는 첫 칭호', condition: '가입하면 바로',
    goal: { stat: 'participation', target: 10, unit: '회', hint: '글쓰기 · 댓글 · 반응 · 투표 모두 1회' } },
  { name: '리포터', tagline: '현장을 직접 전하는 이웃', condition: '게시판 참여 10회',
    goal: { stat: 'agreeReceived', target: 10, unit: '개' } },
  { name: '특파원', tagline: '투표로 인정받는 현장 의견', condition: "내 댓글 '맞아요' 10개",
    goal: { stat: 'score', target: 50, unit: '점', hint: `댓글 투표에서 대표 의견이 되면 +${PICK_SCORE}점` } },
  { name: '천리안', tagline: '동네를 꿰뚫어 보는 최고 칭호', condition: '대표 의견 점수 50점 · 지역 랭킹 등장' },
]

export const scoreOf = (stats: LevelStats) => stats.picks * PICK_SCORE

function statValue(stats: LevelStats, stat: NonNullable<Level['goal']>['stat']) {
  return stat === 'score' ? scoreOf(stats) : stats[stat]
}

// 단계는 순서대로만 오른다: 앞 단계 목표를 채워야 다음 단계 목표를 센다
export function levelIndex(stats: LevelStats) {
  let index = 0
  while (levels[index].goal && statValue(stats, levels[index].goal!.stat) >= levels[index].goal!.target) index += 1
  return index
}

// 지금 단계에서 다음 칭호까지 얼마나 왔는지 (천리안이면 없음)
export function levelProgress(stats: LevelStats) {
  const index = levelIndex(stats)
  const goal = levels[index].goal
  if (!goal) return null
  const current = Math.min(statValue(stats, goal.stat), goal.target)
  return { next: levels[index + 1], current, ...goal, remaining: goal.target - current }
}

export function levelStats(boards: Board[], comments: Comment[], userId: string): LevelStats {
  const myComments = comments.filter((comment) => comment.authorId === userId)
  const myCommentIds = new Set(myComments.map((comment) => comment.id))
  const participation = boards.filter((board) => board.authorId === userId).length + myComments.length
    + boards.filter((board) => myReactions(board).length > 0).length
    + comments.filter((comment) => myCommentReactions(comment).length > 0).length
    + boards.filter((board) => board.vote?.mine).length
  const agreeReceived = myComments.reduce((sum, comment) => sum + comment.reactions['맞아요'], 0)
  // 끝난 투표에서 단독 1위가 된 내 댓글
  const picks = boards.filter((board) => {
    if (board.status === '실시간' || !board.vote || board.vote.cancelled) return false
    const winner = voteWinner(board.vote.candidates)
    return Boolean(winner && myCommentIds.has(winner.commentId))
  }).length
  return { participation, agreeReceived, picks }
}

// 지역 랭킹 (천리안만): 대표 의견 점수 순. 목업 동네와 이웃
export const myRegion = '역삼동'
export const rankRegions = ['역삼동', '논현동', '도곡동']

export interface RankEntry { name: string; picks: number }

export const regionRanks: Record<string, RankEntry[]> = {
  '역삼동': [
    { name: '현장지킴이', picks: 31 }, { name: '역삼출근러', picks: 24 }, { name: '강남역지기', picks: 19 }, { name: '테헤란로', picks: 15 },
    { name: '101동 주민', picks: 12 }, { name: '퇴근길', picks: 9 }, { name: '동네주민', picks: 7 }, { name: '역삼토박이', picks: 5 },
  ],
  '논현동': [
    { name: '말티즈아빠', picks: 22 }, { name: '논현동이웃', picks: 17 }, { name: '가구거리', picks: 11 }, { name: '학동역', picks: 9 },
    { name: '자취생', picks: 6 }, { name: '논현새내기', picks: 5 },
  ],
  '도곡동': [
    { name: '도곡동', picks: 29 }, { name: '매봉역', picks: 20 }, { name: '양재천러너', picks: 13 }, { name: '도곡시장', picks: 8 },
    { name: '타워팰리스', picks: 6 },
  ],
}
