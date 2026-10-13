export type Screen =
  | 'login' | 'home' | 'board' | 'search' | 'detail'
  | 'category' | 'create' | 'edit' | 'my' | 'activity' | 'alerts'
  | 'profile-edit' | 'account-settings' | 'outside'

export type Category = '긴급 사고' | '도움 요청' | '동네 소식' | '일상 불편'
export type BoardStatus = '실시간' | '종료됨' | '숨김'
export type PostReaction = '저도 궁금해요' | '지금도 그래요' | '도움 됐어요' | '이제 끝났어요'
export type CommentReaction = '도움돼요' | '맞아요' | '정보가 달라요'

export interface User {
  id: string
  nickname: string
  age: number
  bio: string
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
