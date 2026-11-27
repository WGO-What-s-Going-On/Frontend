import type { Board } from '../types/domain'

export const isBalancePostId = (id: string) => ['post_3b16ea1a-4de6-4a2c-85be-56a64ada2033', 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2034', 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2035'].includes(id)
const CAT_CONTEST_POST_ID = 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2036'
// Only the six reserved administrator-created campaign identities use their 350m radius.
export const isCampusPostId = (id: string) => ['post_3b16ea1a-4de6-4a2c-85be-56a64ada2031', 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2032', CAT_CONTEST_POST_ID].includes(id) || isBalancePostId(id)
export const isBalancePost = (board: Pick<Board, 'id' | 'lifecyclePolicy'>) => isBalancePostId(board.id) && board.lifecyclePolicy === 'CAU_CAMPUS_2026_30D'
export const isCatContest = (board: Pick<Board, 'id' | 'lifecyclePolicy'>) => board.id === CAT_CONTEST_POST_ID && board.lifecyclePolicy === 'CAU_CAMPUS_2026_30D'
export function participationRadius(board: Pick<Board, 'id' | 'lifecyclePolicy' | 'reach'>): number {
  return board.lifecyclePolicy === 'CAU_CAMPUS_2026_30D' && board.reach === 350 &&
    isCampusPostId(board.id) ? board.reach : 150
}
