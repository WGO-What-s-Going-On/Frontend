import { describe, expect, it } from 'vitest'
import { fromTitleSnapshot, levelIndex, levelProgress, type TitleSnapshot } from '../src/features/level/levels'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TitleProgressCard } from '../src/features/profile/TitleProgressCard'

const snapshot = (stage = 2): TitleSnapshot => ({
  enabled: true, ready: true, policyVersion: 'wgo-titles-v3', currentStage: stage,
  stats: { participation: '10', agreeReceived: '1', picks: '0' },
  stages: [{ stage: 3, code: 'CORRESPONDENT', progress: '1', required: '10', remaining: '9' }],
})
describe('User title snapshot shared by profile and activity', () => {
  it('shows one received AGREE as one tenth of the correspondent gauge', () => {
    const stats = fromTitleSnapshot(snapshot())
    expect(levelIndex(stats)).toBe(1)
    expect(levelProgress(stats)).toMatchObject({ current: 1, target: 10, remaining: 9 })
    const profile = renderToStaticMarkup(createElement(TitleProgressCard, { stats, name: '테스터' }))
    expect(profile).toContain('현재 칭호 리포터')
    expect(profile).toContain('특파원까지 9개 남았어요')
  })
  it('renders a loading or retry state instead of a mock title when a live snapshot is missing', () => {
    const loading = renderToStaticMarkup(createElement(TitleProgressCard, { stats: null, name: '테스터' }))
    const failed = renderToStaticMarkup(createElement(TitleProgressCard, { stats: null, name: '테스터', failed: true }))
    expect(loading).not.toContain('소식통')
    expect(failed).not.toContain('소식통')
    expect(failed).toContain('다시')
  })
  it('uses the awarded stage, even if activity counters would imply another stage', () => {
    const title = snapshot(4)
    const stats = fromTitleSnapshot(title)
    expect(levelIndex(stats)).toBe(3)
    expect(levelProgress(stats)).toBeNull()
  })
  it.each([{ ready: false }, { enabled: false }, { policyVersion: 'wgo-titles-v2' }, { currentStage: 0 }, { currentStage: 5 }, { stages: [] }])('rejects an unusable live snapshot without calculating a mock title: %j', (change) => {
    expect(() => fromTitleSnapshot({ ...snapshot(), ...change })).toThrow()
  })
  it('preserves mock/legacy sequential calculations', () => {
    expect(levelIndex({ participation: 9, agreeReceived: 100, picks: 5 })).toBe(0)
    expect(levelIndex({ participation: 10, agreeReceived: 10, picks: 5 })).toBe(3)
    expect(levelProgress({ participation: 10, agreeReceived: 9, picks: 0 })).toMatchObject({ current: 9, remaining: 1 })
  })
})
