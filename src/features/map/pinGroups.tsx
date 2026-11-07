import { categoryIcon } from '../../domain/categoryIcons'
import type { Board, Category } from '../../types/domain'
import { RADIUS } from './mapWorld'

// 겹친 핀 묶기: 화면에서 가까운(손가락으로 따로 누르기 어려운) 핀은 하나로 합치고 개수를 붙인다.
// 같은 건물 · 같은 자리에서 올라온 글은 확대해도 안 떨어져서, 묶음을 누르면 요약 시트에서 넘겨 본다.
// 지도를 확대해 충분히 멀어지면 다시 따로 보인다
export const GROUP_DISTANCE = 30

// 대표 핀: 더 급한 카테고리가 앞 (긴급 > 도움 > 동네 > 기타)
const priority: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

export interface PinGroup<P> { key: string; lead: Board; boards: Board[]; point: P }

export function groupPins<P extends { x: number; y: number }>(items: { board: Board; point: P }[], distance = GROUP_DISTANCE): PinGroup<P>[] {
  const ordered = [...items].sort((a, b) => priority.indexOf(a.board.category) - priority.indexOf(b.board.category))
  const groups: PinGroup<P>[] = []
  for (const item of ordered) {
    const near = groups.find((group) => Math.hypot(group.point.x - item.point.x, group.point.y - item.point.y) < distance)
    if (near) near.boards.push(item.board)
    else groups.push({ key: item.board.id, lead: item.board, boards: [item.board], point: item.point })
  }
  return groups
}

// 핀 하나(또는 묶음). 묶음이면 오른쪽 위에 개수, 고른 글이 묶음 안에 있으면 그 글 제목을 붙인다
export function PinMarker({ group, selectedId, hotIds, onSelect, style }: {
  group: PinGroup<unknown>
  selectedId?: string
  hotIds: Set<string>
  onSelect: (board: Board, group: Board[]) => void
  style?: React.CSSProperties
}) {
  const selected = group.boards.find((board) => board.id === selectedId)
  const shown = selected ?? group.lead
  const Icon = categoryIcon[shown.category]
  const count = group.boards.length
  return <button className={`map-marker ${selected ? 'selected' : ''} ${group.boards.some((board) => hotIds.has(board.id)) ? 'hot' : ''} ${group.boards.every((board) => board.distance > RADIUS) ? 'far' : ''}`} data-category={shown.category} style={style}
    onClick={(event) => { event.stopPropagation(); onSelect(shown, group.boards) }}
    aria-label={count > 1 ? `이 자리 게시글 ${count}개, ${shown.title}` : `${shown.title}, ${shown.distance}m`}>
    <span className="marker-dot"><Icon size={15} strokeWidth={2.2}/>{count > 1 && <b className="marker-count">{count}</b>}</span>
    {selected && <span className="marker-label">{selected.title}</span>}
  </button>
}
