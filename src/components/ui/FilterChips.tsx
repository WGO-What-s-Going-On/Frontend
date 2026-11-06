import type { Category } from '../../types/domain'

// 여러 항목 중 하나를 고르는 칩 줄. 게시판·지도·최근 활동 필터가 함께 쓴다.
// 모양은 className으로 정한다 (ux-category-filters, map-filters, chips activity-filters).
// category가 있으면 골랐을 때 그 카테고리 색으로 칠한다 (data-category)
export interface FilterChipOption<T extends string> {
  value: T
  label?: string
  count?: number
  category?: Category
}

export function FilterChips<T extends string>({ className, options, selected, onSelect }: {
  className: string
  options: readonly (T | FilterChipOption<T>)[]
  selected: T
  onSelect: (value: T) => void
}) {
  return <div className={className}>{options.map((option) => {
    const { value, label = value, count, category } = typeof option === 'string' ? { value: option } as FilterChipOption<T> : option
    return <button key={value} className={selected === value ? 'selected' : ''} data-category={category} onClick={() => onSelect(value)}>{label}{count !== undefined && <span>{count}</span>}</button>
  })}</div>
}
