import type { Category } from '../../types/domain'

// 글쓰기 화면에서 보여주는 카테고리 이름. 저장되는 값(Category)은 그대로 둔다.
export const writeCategoryLabel: Record<Category, string> = {
  '긴급 사고': '긴급 사고',
  '도움 요청': '도움 요청',
  '동네 소식': '동네 / 일상',
  '일상 불편': '기타',
}
