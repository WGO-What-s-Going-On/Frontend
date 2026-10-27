export type Screen =
  | 'login' | 'home' | 'board' | 'search' | 'detail'
  | 'edit' | 'my' | 'activity' | 'alerts' | 'level'
  | 'profile-edit' | 'notification-settings' | 'outside'
  | 'terms' | 'nickname' | 'location-permission'

export type Category = '긴급 사고' | '도움 요청' | '동네 소식' | '일상 불편'
export type BoardStatus = '실시간' | '종료됨' | '숨김'
export type PostReaction = '저도 궁금해요' | '지금도 그래요' | '도움 됐어요' | '이제 끝났어요'
export type CommentReaction = '도움돼요' | '맞아요' | '정보가 달라요'
// 게시글 공개 범위: 작성할 때 고른다 (작을수록 현장에 있는 사람에게만 보인다)
export type Reach = 150 | 250 | 350
export const reachOptions: Reach[] = [150, 250, 350]

export interface User {
  id: string
  nickname: string
  age: number
  bio: string
  // 실명 (다른 사용자에게 공개하지 않는다)
  realName?: string
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
  // 내가 누른 게시글 반응. 백엔드 규칙상 최대 1개 (배열은 예전 저장 데이터와 맞추기 위한 모양)
  // (예전 저장 데이터는 하나만 담던 reactedByMe라서 myReactions()로 함께 읽는다)
  myReactions?: PostReaction[]
  reactedByMe?: PostReaction
  imageName?: string
  // 목업용: 사진이 첨부된 게시글처럼 보이게 하는 자리 표시 ([이미지])
  imagePlaceholder?: boolean
  // 닉네임 대신 익명으로 표시한 게시글 (USR-F08)
  anonymous?: boolean
  // 목업 지도 좌표 (m 단위). 실제로는 백엔드가 주는 근사 좌표
  position?: { x: number; y: number }
  // 공개 범위 (m). 예전 데이터에는 없어서 없으면 150m
  reach?: Reach
  // 작성 후 수정한 적이 있으면 true (상세에 '수정됨' 표시)
  edited?: boolean
  // 댓글 후보 투표. 글 작성 30분 뒤 고정한 후보 2개와 득표 (없으면 아직 후보를 고르지 않은 것)
  vote?: BoardVote
}

export interface VoteCandidate {
  commentId: string
  // 후보로 고른 때의 댓글 내용. 댓글이 나중에 바뀌거나 지워져도 이 내용으로 보여준다
  content: string
  votes: number
}

export interface BoardVote {
  candidates: VoteCandidate[]
  // 내가 고른 후보 댓글 id (한 사람 한 표)
  mine?: string
  // 투표 중 후보 댓글이 지워져 취소됨
  cancelled?: boolean
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
  // 내가 누른 댓글 공감. 백엔드 규칙상 최대 1개 (예전 데이터의 reactedByMe는 myCommentReactions()로 함께 읽는다)
  myReactions?: CommentReaction[]
  reactedByMe?: CommentReaction
  likedByMe?: boolean
  likes?: number
  edited?: boolean
}

export interface Notice {
  id: string
  type: 'nearby' | 'reply' | 'reaction' | 'lifecycle'
  text: string
  createdAt: string
  read: boolean
  boardId?: string
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

// HOT: 조회수나 댓글이 많이 몰린 진행 중 게시판 (실제 기준은 백엔드 활성도 점수). 지도 HOT 필터와 게시판 HOT 태그가 같이 쓴다.
export function isHotBoard(board: Board, commentCount: number) {
  return board.status === '실시간' && (board.views >= 100 || commentCount >= 5)
}

export function myCommentReactions(comment: Comment): CommentReaction[] {
  return comment.myReactions ?? (comment.reactedByMe ? [comment.reactedByMe] : [])
}

