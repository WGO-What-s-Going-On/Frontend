import type { Board } from '../types/domain'

export const isBalancePostId = (id: string) => ['post_3b16ea1a-4de6-4a2c-85be-56a64ada2033', 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2034', 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2035'].includes(id)
const CAT_CONTEST_POST_ID = 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2036'
// Only the six reserved administrator-created campaign identities use their 350m radius.
export const isCampusPostId = (id: string) => ['post_3b16ea1a-4de6-4a2c-85be-56a64ada2031', 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2032', CAT_CONTEST_POST_ID].includes(id) || isBalancePostId(id)
export const isBalancePost = (board: Pick<Board, 'id' | 'lifecyclePolicy'>) => isBalancePostId(board.id) && board.lifecyclePolicy === 'CAU_CAMPUS_2026_30D'
export const isCatContest = (board: Pick<Board, 'id' | 'lifecyclePolicy'>) => board.id === CAT_CONTEST_POST_ID && board.lifecyclePolicy === 'CAU_CAMPUS_2026_30D'
// 캠퍼스 이벤트 정책은 서버가 관리자 생성 글에만 붙인다 (일반 작성 · 수정 API는 이 값을 받지 않음).
// 그래서 글 ID 목록 없이 정책 + 350m만 보고 350m 참여를 연다. 새 이벤트 글도 프론트 배포 없이 바로 350m로 동작
export const CAMPUS_POLICY = 'CAU_CAMPUS_2026_30D'
export const isCampusEvent = (board: Pick<Board, 'lifecyclePolicy' | 'reach'>) => board.lifecyclePolicy === CAMPUS_POLICY && board.reach === 350
export function participationRadius(board: Pick<Board, 'lifecyclePolicy' | 'reach'>): number {
  return isCampusEvent(board) ? 350 : 150
}
