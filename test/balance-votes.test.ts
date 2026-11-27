import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../src/api/client', () => ({ api: vi.fn(), ApiError: class extends Error {} }))
vi.mock('../src/context/AppContext', () => ({ useApp: () => ({ comments: [], startVote: vi.fn(), castVote: vi.fn() }) }))
import { toBoardVote, type VoteResponse } from '../src/api/posts'
import { isBalancePost, participationRadius } from '../src/domain/participation'
import { CommentVoteSection } from '../src/features/board/CommentVoteSection'
import type { Board } from '../src/types/domain'

const id = 'post_3b16ea1a-4de6-4a2c-85be-56a64ada2033'
const response = { status: 'OPEN', candidates: [{ commentId: 'option_A', content: '송강', votes: 2 }, { commentId: 'option_B', content: '종강', votes: 3 }], mySelection: 'option_A' } as VoteResponse
const board = { id, lifecyclePolicy: 'CAU_CAMPUS_2026_30D', reach: 350, status: '실시간', ...toBoardVote(response) } as Board
describe('fixed balance polls reuse the existing vote UI', () => {
  it.each([3, 4, 5])('uses 350m for balance board %s and 150m without the campus policy or 350m reach', (suffix) => {
    const fixed = { ...board, id: `post_3b16ea1a-4de6-4a2c-85be-56a64ada203${suffix}` }
    expect(isBalancePost(fixed)).toBe(true)
    for (const distance of [150, 151, 349.99, 350, 350.01]) expect(distance <= participationRadius(fixed)).toBe(distance <= 350)
    expect(participationRadius({ ...fixed, reach: 150 })).toBe(150)
    expect(isBalancePost({ ...fixed, id: 'ordinary' })).toBe(false)
    expect(participationRadius({ ...fixed, lifecyclePolicy: undefined })).toBe(150)
  })
  it('renders both options, selection and results with no candidate comments', () => {
    const html = renderToStaticMarkup(createElement(CommentVoteSection, { board, canChoose: true }))
    expect(html).toContain('밸런스 투표')
    expect(html).toContain('송강')
    expect(html).toContain('종강')
    expect(html).toContain('5명 참여')
    expect(html).toContain('aria-pressed="true"')
    expect((html.match(/<button/g) ?? []).length).toBe(2)
    expect(html).not.toContain('disabled=""')
  })
  it('outside the radius permits only cancelling the current selection', () => {
    const html = renderToStaticMarkup(createElement(CommentVoteSection, { board, canChoose: false }))
    expect((html.match(/disabled=""/g) ?? []).length).toBe(1)
  })
  it('disables both choices after expiration and retains results', () => {
    const closed = { ...board, ...toBoardVote({ ...response, status: 'CLOSED' }) }
    const html = renderToStaticMarkup(createElement(CommentVoteSection, { board: closed, canChoose: true }))
    expect((html.match(/disabled=""/g) ?? []).length).toBe(2)
    expect(html).toContain('투표 종료')
    expect(html).toContain('종강')
  })
  it('keeps ordinary comment vote labels and existing campus NONE polls hidden', () => {
    const ordinary = { ...board, id: 'ordinary' }
    expect(renderToStaticMarkup(createElement(CommentVoteSection, { board: ordinary, canChoose: true }))).toContain('댓글 투표')
    for (const suffix of [1, 2]) {
      const old = { ...board, id: `post_3b16ea1a-4de6-4a2c-85be-56a64ada203${suffix}`, ...toBoardVote({ ...response, status: 'NONE' }) }
      expect(renderToStaticMarkup(createElement(CommentVoteSection, { board: old, canChoose: true }))).toBe('')
    }
  })
})
