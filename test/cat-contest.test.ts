import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
const context = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('../src/api/client', () => ({ api: vi.fn(), ApiError: class extends Error {} }))
vi.mock('../src/context/AppContext', () => ({ useApp: () => context.current }))
import { isBalancePost, isCampusPostId, isCatContest, participationRadius } from '../src/domain/participation'
import { BoardDetailScreen } from '../src/features/board/BoardScreens'
import type { Board, Comment } from '../src/types/domain'

const board: Board = {
  id: 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2036', lifecyclePolicy: 'CAU_CAMPUS_2026_30D', reach: 350,
  authorId: '1', authorName: 'WGO', category: '동네 소식', title: '🐱 중냥이 사진 콘테스트', body: '댓글당 사진 1장과 댓글 공감',
  distance: 177, createdAt: '방금 전', status: '실시간', views: 0, voteStatus: 'NONE',
  reactions: { '저도 궁금해요': 0, '지금도 그래요': 0, '도움 됐어요': 0, '이제 끝났어요': 0 },
}
function detail(post: Board, comments: Comment[] = [], locationGranted = true) {
  context.current = { currentBoard: post, screen: 'detail', comments, user: { id: '1', nickname: 'WGO' },
    inRange: locationGranted, locationPermission: locationGranted ? 'granted' : 'denied', blockedUsers: [],
    back: vi.fn(), go: vi.fn(), showToast: vi.fn(), startVote: vi.fn() }
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BoardDetailScreen)))
}
describe('one reserved cat photo contest', () => {
  it.each([150, 151, 177, 349.99, 350, 350.01])('uses the approved radius at %sm', (distance) => {
    expect(distance <= participationRadius(board)).toBe(distance <= 350)
    const html = detail({ ...board, distance })
    expect(html.includes('aria-label="댓글에 사진 첨부"')).toBe(distance <= 350)
    if (distance > 350) expect(html).toContain('350m 안에서만 댓글 가능')
  })
  it('at the actual observed 177m shows the single-image composer rather than read-only', () => {
    const html = detail(board)
    expect(html).toContain('사진 1장과 짧은 설명을 남겨주세요')
    expect(html).toContain('type="file" accept="image/*"')
    expect(html).not.toContain('multiple=')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="댓글 등록"/)
    expect(html).not.toContain('150m 안에서만 댓글 가능')
    expect(html).not.toContain('aria-label="댓글 투표"')
  })
  it('keeps ordinary posts and mismatched metadata at 150m', () => {
    for (const post of [{ ...board, id: 'ordinary' }, { ...board, lifecyclePolicy: undefined }, { ...board, reach: 150 as const }]) {
      expect(participationRadius(post)).toBe(150)
      expect(detail(post)).toContain('150m 안에서만 댓글 가능')
    }
    expect(isCatContest({ ...board, lifecyclePolicy: undefined })).toBe(false)
    expect(isCampusPostId(board.id)).toBe(true)
    expect(isBalancePost(board)).toBe(false)
  })
  it('keeps denied location and expired contests read-only', () => {
    expect(detail(board, [], false)).not.toContain('aria-label="댓글에 사진 첨부"')
    expect(detail({ ...board, status: '종료됨' })).not.toContain('aria-label="댓글에 사진 첨부"')
  })
  it('shows photo, author and comment reaction counts through the existing comment UI', () => {
    const comment: Comment = { id: 'comment-entry', boardId: board.id, authorId: '2', authorName: '사진 작성자', body: '직접 찍은 중냥이',
      imageUrl: '/cat-test.png', createdAt: '방금 전', verified: false, reactions: { '도움돼요': 1, '맞아요': 7, '정보가 달라요': 0 } }
    const html = detail(board, [comment])
    expect(html).toContain('사진 작성자')
    expect(html).toContain('aria-label="댓글 사진 크게 보기"')
    expect(html).toContain('aria-label="맞아요 7"')
    expect(html).toContain('aria-label="공감 남기기"')
  })
})
