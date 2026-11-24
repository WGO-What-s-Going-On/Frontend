import { describe, expect, it, vi } from 'vitest'
vi.mock('../src/api/client', () => ({ api: vi.fn(), ApiError: class extends Error {} }))
import { participationRadius } from '../src/domain/participation'
import { toBoard, type PostResponse } from '../src/api/posts'
const id = 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2031'
describe('two reserved CAU campaign posts', () => {
  it.each([150, 151, 349.9, 350, 350.1])('uses the campaign radius at %sm', (distance) => {
    const radius = participationRadius({ id, lifecyclePolicy: 'CAU_CAMPUS_2026_30D', reach: 350 })
    expect(distance <= radius).toBe(distance <= 350)
  })
  it.each([
    { id: 'ordinary', reach: 350 as const, lifecyclePolicy: 'CAU_CAMPUS_2026_30D' },
    { id, reach: 350 as const }, { id, reach: 150 as const, lifecyclePolicy: 'CAU_CAMPUS_2026_30D' },
    { id: 'ordinary', reach: 250 as const },
  ])('retains 150m for ordinary or unverified metadata: %j', (board) => expect(participationRadius(board)).toBe(150))
  it('preserves the server policy in list/detail mapping', () => {
    const board = toBoard({ postId: id, lifecyclePolicy: 'CAU_CAMPUS_2026_30D', radiusM: 350, category: 'NEWS', authorId: 1, createdAt: new Date().toISOString(), status: 'ACTIVE', counters: { viewCount: 0, commentCount: 0 } } as PostResponse)
    expect(participationRadius(board)).toBe(350)
    expect(board.voteStatus).toBe('NONE')
  })
})
