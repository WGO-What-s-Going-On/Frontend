import type { Board, Category } from '../types/domain'

// 비슷한 게시판 찾기 (PST-F17): 같은 카테고리의 진행 중인 게시판 중 150m 안에서 핵심 단어가 겹치는 것.
// 실제로는 위치·시간·내용 유사도를 백엔드가 판단한다.
const stopWords = new Set(['여기', '지금', '혹시', '그냥', '정말', '너무', '어디', '근처', '주변', '있나요', '있어요', '해요', '같아요'])

function keywords(text: string) {
  return new Set(text.replace(/[^가-힣a-zA-Z0-9\s]/g, ' ').split(/\s+/).map((word) => word.replace(/(이야|이에요|예요|야|요|이|가|은|는|을|를|에|도)$/, '')).filter((word) => word.length >= 2 && !stopWords.has(word)))
}

export function findSimilarBoard(boards: Board[], category: Category, text: string) {
  const words = keywords(text)
  if (!words.size) return undefined
  return boards.find((board) => board.status === '실시간' && board.category === category && board.distance <= 150 && [...keywords(`${board.title} ${board.body}`)].some((word) => words.has(word)))
}
