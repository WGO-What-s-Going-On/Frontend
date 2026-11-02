export type Screen =
  | 'login' | 'home' | 'board' | 'search' | 'detail'
  | 'edit' | 'my' | 'activity' | 'alerts' | 'level'
  | 'profile-edit' | 'notification-settings' | 'outside'
  | 'terms' | 'nickname' | 'location-permission' | 'kakao-callback'

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
  // 서버 사용자 ID (실제 로그인했을 때만). 목업 글 · 댓글의 작성자 비교는 id('me')로 계속 한다
  serverId?: string
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
  // 서버에 올라간 첨부 사진 주소 (백엔드 연동 후)
  imageUrl?: string
  // 목업용: 사진이 첨부된 게시글처럼 보이게 하는 자리 표시 ([이미지])
  imagePlaceholder?: boolean
  // 닉네임 대신 익명으로 표시한 게시글 (USR-F08)
  anonymous?: boolean
  // 목업 지도 좌표 (m 단위). 실제로는 백엔드가 주는 근사 좌표
  position?: { x: number; y: number }
  // 서버 글의 실제 위경도 (실제 지도에 핀을 찍을 때 사용)
  location?: { latitude: number; longitude: number }
  // 공개 범위 (m). 예전 데이터에는 없어서 없으면 150m
  reach?: Reach
  // 작성 후 수정한 적이 있으면 true (상세에 '수정됨' 표시)
  edited?: boolean
  // 댓글 후보 투표. 글 작성 30분 뒤 고정한 후보 2개와 득표 (없으면 아직 후보를 고르지 않은 것)
  vote?: BoardVote
  // 서버가 알려준 댓글 수 (서버 연동 때, 목록에서는 댓글을 따로 불러오지 않으므로)
  commentCount?: number
  // 서버가 알려준 투표 상태 (실제 서버 연동 때만). 있으면 목업 계산 대신 이 값을 쓴다
  voteStatus?: 'PENDING' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'NONE'
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

// 게시판 댓글 수: 서버가 준 값이 있으면 그 값, 목업이면 댓글을 센다
export function commentCountOf(board: Board, comments: Comment[]) {
  return board.commentCount ?? comments.filter((comment) => comment.boardId === board.id).length
}

export function myCommentReactions(comment: Comment): CommentReaction[] {
  return comment.myReactions ?? (comment.reactedByMe ? [comment.reactedByMe] : [])
}

