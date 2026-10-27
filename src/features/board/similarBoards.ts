import type { Board, Category } from '../../types/domain'

// 중복 글 막기: 쓰려는 글과 비슷한 진행 중 게시판을 최대 3개 찾는다.
// 실제 판별은 백엔드가 하고, 목업은 글자 두 개씩 묶음(바이그램)이 얼마나 겹치는지로 본다 (한국어는 조사가 붙어도 겹침이 남는다).
export const SIMILAR_LIMIT = 3

// 어떤 글에나 흔히 나오는 말끝은 겹쳐도 세지 않는다
const commonPairs = new Set(['어요', '해요', '있어', '세요', '니다', '습니', '에서', '는데', '했어', '아요', '은데', '어서', '해서', '하는', '있는', '같아', '같은', '나요', '까요', '이에', '예요', '이야', '거나', '라고', '지금', '혹시'])

function pairs(text: string) {
  const result = new Set<string>()
  for (const word of text.toLowerCase().split(/[^0-9a-z가-힣]+/)) {
    for (let index = 0; index < word.length - 1; index += 1) {
      const pair = word.slice(index, index + 2)
      if (!commonPairs.has(pair)) result.add(pair)
    }
  }
  return result
}

export function findSimilarBoards(boards: Board[], draft: { category: Category; body: string }) {
  const mine = pairs(draft.body)
  if (mine.size === 0) return []
  return boards
    .filter((board) => board.status === '실시간')
    .map((board) => {
      const theirs = pairs(`${board.title} ${board.body}`)
      let shared = 0
      mine.forEach((pair) => { if (theirs.has(pair)) shared += 1 })
      // 겹친 묶음 비율 + 같은 카테고리면 조금 더
      return { board, shared, score: shared / mine.size + (board.category === draft.category ? .1 : 0) }
    })
    .filter((item) => item.shared >= 2 && item.score >= .25)
    .sort((a, b) => b.score - a.score || a.board.distance - b.board.distance)
    .slice(0, SIMILAR_LIMIT)
    .map((item) => item.board)
}
