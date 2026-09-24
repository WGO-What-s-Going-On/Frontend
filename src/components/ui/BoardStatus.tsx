import type { Board } from '../../types/domain'

export const PARTICIPATION_RADIUS = 150

export type Participation = { canJoin: boolean; closed: boolean }

/** 참여 가능 여부 규칙은 한 곳에만 둔다. */
export function participationOf(board: Board, inRange: boolean): Participation {
  if (board.status === '종료됨') return { canJoin: false, closed: true }
  return { canJoin: inRange && board.distance <= PARTICIPATION_RADIUS, closed: false }
}

/**
 * 대부분의 게시판은 실시간이고 참여 가능하다. 그 기본값을 매번 말하면 화면만 시끄러워진다.
 * 거리는 늘 보여주고, 나머지는 예외일 때만 덧붙인다.
 */
export function StatusLine({ board, inRange }: { board: Board; inRange: boolean }) {
  const { canJoin, closed } = participationOf(board, inRange)
  if (closed) return <span className="status-line closed">종료됨</span>
  return <span className={`status-line ${canJoin ? '' : 'read-only'}`}>{board.distance}m{!canJoin && ' · 읽기만'}</span>
}
