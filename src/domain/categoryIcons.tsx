import { CircleHelp, Flame, Hand, Megaphone, type LucideIcon } from 'lucide-react'
import type { Category } from '../types/domain'

// 카테고리 아이콘. 지도 핀, 글쓰기 카테고리 버튼이 같은 아이콘을 쓴다
export const categoryIcon: Record<Category, LucideIcon> = {
  '긴급 사고': Flame,
  '도움 요청': Hand,
  '동네 소식': Megaphone,
  '일상 불편': CircleHelp,
}

export function CategoryIcon({ category, size = 17 }: { category: Category; size?: number }) {
  const Icon = categoryIcon[category]
  return <Icon size={size} strokeWidth={2.2} aria-hidden="true"/>
}
