import type { Category, PostReaction } from '../types/domain'

// 화면에 보이는 문구 모음. 저장·전송되는 값(타입)과 화면 문구를 분리해 둔다.
// 백엔드 연동 후에는 서버 코드값(예: EMERGENCY) → 문구 변환도 여기서 한다.

// 카테고리 이름. 게시판 필터, 게시글 카드, 지도 시트, 글쓰기 화면이 모두 이 이름을 쓴다.
export const categoryLabel: Record<Category, string> = {
  '긴급 사고': '긴급/사고',
  '도움 요청': '도움 요청',
  '동네 소식': '동네/일상',
  '일상 불편': '기타',
}

// 게시글 반응: full은 상세 화면, short는 좁은 곳에서 쓰는 이름
export const reactionLabel: Record<PostReaction, { full: string; short: string }> = {
  '저도 궁금해요': { full: '저도 궁금해요', short: '궁금' },
  '지금도 그래요': { full: '아직 진행 중이에요', short: '진행 중' },
  '도움 됐어요': { full: '유익해요', short: '유익함' },
  '이제 끝났어요': { full: '끝났어요', short: '끝남' },
}
