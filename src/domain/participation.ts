import type { Board } from '../types/domain'

// Only the two administrator-created campaign identities use their 350m radius.
export const isCampusPostId = (id: string) => ['post_3b16ea1a-4de6-4a2c-85be-56a64ada2031', 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2032'].includes(id)
export function participationRadius(board: Pick<Board, 'id' | 'lifecyclePolicy' | 'reach'>): number {
  return board.lifecyclePolicy === 'CAU_CAMPUS_2026_30D' && board.reach === 350 &&
    isCampusPostId(board.id) ? board.reach : 150
}
