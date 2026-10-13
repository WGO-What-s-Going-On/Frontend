export type Screen =
  | 'login' | 'home' | 'board' | 'search' | 'detail'
  | 'category' | 'create' | 'edit' | 'my' | 'activity' | 'alerts'
  | 'profile-edit' | 'account-settings' | 'outside'
  | 'terms' | 'nickname' | 'location-permission' | 'admin'

export type Category = '긴급 사고' | '도움 요청' | '동네 소식' | '일상 불편'
// 해결됨: 작성자가 '해결됐어요'로 표시한 게시판 (PST-F18). 종료됨처럼 새 참여를 막는다.
export type BoardStatus = '실시간' | '해결됨' | '종료됨' | '숨김'
export type PostReaction = '저도 궁금해요' | '지금도 그래요' | '도움 됐어요' | '이제 끝났어요'
export type CommentReaction = '도움돼요' | '맞아요' | '정보가 달라요'

export interface User {
  id: string
  nickname: string
  age: number
  bio: string
  // 등록한 프로필 사진 (없으면 기본 프로필 이미지)
  profileImage?: string
  // 약관 동의와 닉네임 설정을 마쳤는지
  onboarded?: boolean
}

export interface Board {
  id: string
  authorId: string
  authorName: string
  category: Category
  title: string
  body: string
  distance: number
  createdAt: string
  status: BoardStatus
  views: number
  reactions: Record<PostReaction, number>
  // 내가 누른 게시글 반응. 여러 개를 동시에 누를 수 있다.
  // (예전 저장 데이터는 하나만 담던 reactedByMe라서 myReactions()로 함께 읽는다)
  myReactions?: PostReaction[]
  reactedByMe?: PostReaction
  imageName?: string
  // 첨부한 현장 사진 (목업에서는 data URL)
  imageUrl?: string
  // 닉네임 대신 익명으로 표시한 게시글 (USR-F08)
  anonymous?: boolean
  // 작성 후 수정한 적이 있으면 true (상세에 '수정됨' 표시)
  edited?: boolean
}

export interface Comment {
  id: string
  boardId: string
  authorId: string
  authorName: string
  body: string
  imageUrl?: string
  imagePlaceholder?: boolean
  read?: boolean
  createdAt: string
  verified: boolean
  parentId?: string
  reactions: Record<CommentReaction, number>
  reactedByMe?: CommentReaction
  likedByMe?: boolean
  likes?: number
  edited?: boolean
}

export interface Notice {
  id: string
  type: 'nearby' | 'reply' | 'reaction' | 'comment-like' | 'bundle' | 'lifecycle'
  text: string
  createdAt: string
  read: boolean
  boardId?: string
  // 알림을 누르면 이동할 댓글 (NTF-F01)
  commentId?: string
}

export interface Report {
  id: string
  targetType: '게시글' | '댓글'
  targetId: string
  reason: string
  status: '접수' | '처리 완료'
}

export function myReactions(board: Board): PostReaction[] {
  return board.myReactions ?? (board.reactedByMe ? [board.reactedByMe] : [])
}

// 새 댓글·반응을 받을 수 있는 상태인지
export function isOpenBoard(board: Board) {
  return board.status === '실시간'
}

// HOT: 조회수나 댓글이 많이 몰린 게시판 (MAP-F15). 실제 기준은 백엔드 활성도 점수로 바뀐다.
export function isHotBoard(board: Board, commentCount: number) {
  return board.status === '실시간' && (board.views >= 100 || commentCount >= 5)
}

// 활성도 (MAP-F08): 조회·댓글·반응을 합쳐 세 단계로
export function activityLevel(board: Board, commentCount: number): '활발' | '보통' | '조용' {
  const reactions = Object.values(board.reactions).reduce((sum, count) => sum + count, 0)
  const score = board.views + commentCount * 10 + reactions
  return score >= 150 ? '활발' : score >= 60 ? '보통' : '조용'
}
