import { Circle, Lock, MapPin } from 'lucide-react'
import type { Board } from '../../types/domain'

export const PARTICIPATION_RADIUS = 150

export type Participation = {
  canJoin: boolean
  /** 상태 한 단어. 목록/시트/상세에서 동일하게 쓴다. */
  state: '실시간' | '종료됨'
  /** 참여 가능 여부를 사용자 언어로 설명한 한 조각. */
  access: string
}

/**
 * 참여 가능 여부는 세 화면에서 각각 다르게 계산되고 있었다.
 * 규칙을 한 곳에 모아 "들어가기 전에" 결과를 알 수 있게 한다.
 */
export function participationOf(board: Board, inRange: boolean): Participation {
  if (board.status === '종료됨') return { canJoin: false, state: '종료됨', access: '읽기만' }
  if (!inRange || board.distance > PARTICIPATION_RADIUS) return { canJoin: false, state: '실시간', access: '범위 밖 · 읽기만' }
  return { canJoin: true, state: '실시간', access: '참여 가능' }
}

/** 상태 · 거리 · 참여 가능 여부를 한 줄로. 카드/시트/상세가 모두 이 줄을 쓴다. */
export function StatusLine({ board, inRange, showDistance = true }: { board: Board; inRange: boolean; showDistance?: boolean }) {
  const { canJoin, state, access } = participationOf(board, inRange)
  return <p className={`status-line ${canJoin ? 'can-join' : 'read-only'}`}>
    <span className="status-state">{state === '실시간' ? <Circle size={7} className="live-dot"/> : null}{state}</span>
    {showDistance && <span className="status-distance"><MapPin size={12}/>{board.distance}m</span>}
    <span className="status-access">{!canJoin && <Lock size={11}/>}{access}</span>
  </p>
}
