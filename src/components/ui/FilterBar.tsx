import type { Board, Category } from '../../types/domain'
import { participationOf } from './BoardStatus'

export type CategoryFilter = Category | '전체'
export type BoardSort = '거리' | '최신' | '활발'

export const CATEGORY_OPTIONS: CategoryFilter[] = ['전체', '긴급 사고', '도움 요청', '동네 소식', '일상 불편']
export const SORT_OPTIONS: BoardSort[] = ['거리', '최신', '활발']

/**
 * 지도는 전체/긴급·사고/도움요청/HOT, 게시판은 전체/긴급 사고/도움 요청/동네 소식을 쓰고 있었다.
 * 축이 서로 달라 같은 데이터를 오갈 때 감각이 끊기고, '일상 불편'은 목록에서 고를 수조차 없었다.
 */
export function CategoryChips({ value, onChange }: { value: CategoryFilter; onChange: (next: CategoryFilter) => void }) {
  return <div className="filter-chips" role="group" aria-label="카테고리 필터">
    {CATEGORY_OPTIONS.map((item) => <button key={item} className={value === item ? 'selected' : ''} aria-pressed={value === item} onClick={() => onChange(item)}>{item}</button>)}
  </div>
}

/** 정렬은 네이티브 select 대신 칩으로. 무엇이 선택돼 있는지 열어보지 않아도 보인다. */
export function SortChips({ value, onChange, joinableOnly, onJoinableOnly }: {
  value: BoardSort
  onChange: (next: BoardSort) => void
  joinableOnly: boolean
  onJoinableOnly: (next: boolean) => void
}) {
  return <div className="filter-chips sort-chips" role="group" aria-label="정렬과 참여 조건">
    {SORT_OPTIONS.map((item) => <button key={item} className={value === item ? 'selected' : ''} aria-pressed={value === item} onClick={() => onChange(item)}>{item}순</button>)}
    <button className={`joinable-toggle ${joinableOnly ? 'selected' : ''}`} aria-pressed={joinableOnly} onClick={() => onJoinableOnly(!joinableOnly)}>참여 가능만</button>
  </div>
}

/** 목록과 지도가 같은 규칙으로 걸러지도록 필터링을 한 곳에 모은다. */
export function applyBoardFilters(boards: Board[], { category, sort, joinableOnly, inRange }: {
  category: CategoryFilter
  sort: BoardSort
  joinableOnly: boolean
  inRange: boolean
}) {
  const filtered = boards.filter((board) => board.status !== '숨김'
    && (category === '전체' || board.category === category)
    && (!joinableOnly || participationOf(board, inRange).canJoin))
  return [...filtered].sort((a, b) => {
    if (sort === '거리') return a.distance - b.distance
    if (sort === '활발') return Object.values(b.reactions).reduce((x, y) => x + y, 0) - Object.values(a.reactions).reduce((x, y) => x + y, 0)
    return b.id.localeCompare(a.id)
  })
}
