import { api } from './client'
import type { Board, Category, Comment, CommentReaction, PostReaction, Reach } from '../types/domain'

// 게시글 · 댓글 · 공감 · 투표 · 활동 API (백엔드 docs/contracts/frontend-integration.md 기준).
// 화면은 아직 목업 데이터를 쓰고, serverFeatures.posts를 켜면 여기 함수로 바꿔 끼운다 (docs/api-integration.md)

// 우리 화면 이름 ↔ 서버 코드 (GET /posts/categories와 같은 값)
export const categoryCode: Record<Category, string> = { '긴급 사고': 'EMERGENCY', '도움 요청': 'HELP', '동네 소식': 'NEWS', '일상 불편': 'ETC' }
export const postReactionCode: Record<PostReaction, PostReactionCode> = { '저도 궁금해요': 'CURIOUS', '지금도 그래요': 'STILL_HAPPENING', '도움 됐어요': 'HELPFUL', '이제 끝났어요': 'ENDED' }
export const commentReactionCode: Record<CommentReaction, CommentReactionCode> = { '도움돼요': 'HELPFUL', '맞아요': 'AGREE', '정보가 달라요': 'DIFFERENT' }
type PostReactionCode = 'CURIOUS' | 'STILL_HAPPENING' | 'HELPFUL' | 'ENDED'
type CommentReactionCode = 'HELPFUL' | 'AGREE' | 'DIFFERENT'

export interface PostResponse {
  postId: string
  // 익명 글을 다른 사람이 보면 null
  authorId: number | null
  authorNickname: string | null
  anonymous: boolean
  category: string
  title: string
  content: string
  status: 'ACTIVE' | 'EXPIRED' | 'DELETED'
  locationSnapshot: { latitude: number; longitude: number }
  radiusM: number
  // 상세는 조회 좌표를 함께 보낼 때만 계산, 목록은 항상 있음
  distanceM: number | null
  counters: { viewCount: number; commentCount: number; reactionCount: number; participantCount: number }
  reactionCounts: Record<PostReactionCode, number>
  myReaction: PostReactionCode | null
  media: { mediaId: string; type: 'IMAGE' | 'VIDEO'; url: string; expiresAt: string }[]
  // 작성자가 직접 닫은 시각 (자동 만료와 별개)
  closedAt: string | null
  createdAt: string
  expiresAt: string
}

export interface CommentResponse {
  commentId: string
  postId: string
  authorId: number
  authorNickname: string | null
  content: string
  status: 'ACTIVE' | 'DELETED'
  reactionCounts?: Record<CommentReactionCode, number>
  myReaction: CommentReactionCode | null
  // 답글은 한 단계만
  parentCommentId: string | null
  // 작성 당시 150m 안에서 쓴 댓글
  verified: boolean
  media: { mediaId: string; url: string }[]
  createdAt: string
}

export interface VoteResponse {
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'NONE'
  candidates: { commentId: string; content: string; votes: number }[]
  winner: { commentId: string; content: string; votes: number } | null
  mySelection: { commentId: string } | null
}

export interface Coords { latitude: number; longitude: number }
export interface DraftInput extends Coords { title: string; content: string; category: Category; radiusM: Reach; anonymous?: boolean; mediaIds?: string[] }
export interface NearbyQuery extends Coords { radiusM?: Reach; sort?: 'distance' | 'latest'; category?: Category; q?: string; cursor?: string; limit?: number }

const path = (postId: string, rest = '') => `/api/v1/posts/${encodeURIComponent(postId)}${rest}`
const draftBody = (draft: DraftInput) => ({ ...draft, category: categoryCode[draft.category] })

// 주변 글 목록 (지도 핀 · 게시판 · 검색은 q)
export const getNearbyPosts = ({ category, ...query }: NearbyQuery) => api<{ posts: PostResponse[]; nextCursor: string | null }>('GET', '/api/v1/posts/nearby', { query: { ...query, category: category && categoryCode[category] } })
export const getCategories = () => api<{ code: string; label: string }[]>('GET', '/api/v1/posts/categories')
export const createPost = (draft: DraftInput) => api<PostResponse>('POST', '/api/v1/posts', { body: draftBody(draft) })
// 비슷한 글: 서버는 150m · 최근 24시간 안에서 찾는다 (limit 1~10)
export const findSimilarPosts = (draft: DraftInput) => api<{ items: { postId: string; title: string; excerpt: string; category: string; distanceM: number; createdAt: string }[]; checkStatus: 'completed' | 'partial' }>('POST', '/api/v1/posts/similar', { body: { ...draftBody(draft), limit: 3 } })
// 좌표를 같이 보내야 distanceM이 온다
export const getPost = (postId: string, coords?: Coords) => api<PostResponse>('GET', path(postId), { query: { ...coords } })
export const editPost = (postId: string, input: { title?: string; content?: string }) => api<void>('PATCH', path(postId), { body: input })
export const setPostClosed = (postId: string, closed: boolean) => api<void>('PUT', path(postId, '/closed'), { body: { closed } })
export const deletePost = (postId: string) => api<void>('DELETE', path(postId))
export const getComments = (postId: string, cursor?: string) => api<{ comments: CommentResponse[]; nextCursor: string | null }>('GET', path(postId, '/comments'), { query: { limit: 100, cursor } })
export const createComment = (postId: string, content: string, parentCommentId?: string, mediaIds?: string[]) => api<CommentResponse>('POST', path(postId, '/comments'), { body: { content, parentCommentId, mediaIds } })
export const deleteComment = (postId: string, commentId: string) => api<void>('DELETE', path(postId, `/comments/${encodeURIComponent(commentId)}`))
// 반응 변경은 기존 종류 DELETE 후 새 종류 POST
export const reactToPost = (postId: string, reaction: PostReaction) => api<unknown>('POST', path(postId, '/reactions'), { body: { type: postReactionCode[reaction] } })
export const cancelPostReaction = (postId: string, reaction: PostReaction) => api<void>('DELETE', path(postId, `/reactions/${postReactionCode[reaction]}`))
export const reactToComment = (postId: string, commentId: string, reaction: CommentReaction) => api<unknown>('POST', path(postId, `/comments/${encodeURIComponent(commentId)}/reactions`), { body: { type: commentReactionCode[reaction] } })
export const cancelCommentReaction = (postId: string, commentId: string, reaction: CommentReaction) => api<void>('DELETE', path(postId, `/comments/${encodeURIComponent(commentId)}/reactions/${commentReactionCode[reaction]}`))
export const getVote = (postId: string) => api<VoteResponse>('GET', path(postId, '/vote'))
export const castVote = (postId: string, commentId: string) => api<VoteResponse>('PUT', path(postId, '/vote'), { body: { commentId } })
export const cancelVote = (postId: string) => api<void>('DELETE', path(postId, '/vote'))
export const joinPost = (postId: string) => api<unknown>('POST', path(postId, '/participants'))
export const updateLocation = ({ latitude, longitude }: Coords) => api<{ updatedAt: string }>('PUT', '/api/v1/location', { body: { latitude, longitude } })
export const reportTarget = (targetType: 'POST' | 'COMMENT', targetId: string, reason: string) => api<{ reportId: string; status: 'PENDING' }>('POST', '/api/v1/moderation/reports', { body: { targetType, targetId, reason } })

// 활동 · 칭호 · 행정동 랭킹
export interface LevelResponse { participation: number; agreeReceived: number; picks: number; score: number; level: 1 | 2 | 3 | 4; title: string }
export const getMyLevel = () => api<LevelResponse>('GET', '/api/v1/posts/me/level')
export const getMyActivity = (cursor?: string) => api<{ items: { kind: 'POST' | 'COMMENT' | 'REACTION' | 'COMMENT_REACTION' | 'VOTE'; postId: string; commentId?: string; createdAt: string; closedAt: string | null }[]; nextCursor: string | null }>('GET', '/api/v1/posts/me/activity', { query: { cursor } })
export const getMyRegion = ({ latitude, longitude }: Coords) => api<{ code: string; name: string }>('GET', '/api/v1/posts/me/region', { query: { latitude, longitude } })
export const getRanking = (regionCode: string) => api<{ regionCode: string; items: { rank: number; userId: number; authorNickname: string | null; picks: number; score: number }[]; myRank: number | null; myScore: number }>('GET', '/api/v1/posts/me/ranking', { query: { regionCode } })

// 서버 응답 → 화면 데이터
const categoryFromCode = (code: string): Category => (Object.entries(categoryCode).find(([, value]) => value === code)?.[0] as Category | undefined) ?? '일상 불편'
const postReactionFromCode = (code: PostReactionCode) => (Object.entries(postReactionCode).find(([, value]) => value === code)?.[0]) as PostReaction
const commentReactionFromCode = (code: CommentReactionCode) => (Object.entries(commentReactionCode).find(([, value]) => value === code)?.[0]) as CommentReaction

export function toBoard(post: PostResponse): Board {
  const counts = post.reactionCounts
  return {
    id: post.postId, authorId: post.authorId === null ? '' : String(post.authorId), authorName: post.anonymous ? '익명' : post.authorNickname ?? '알 수 없음',
    anonymous: post.anonymous, category: categoryFromCode(post.category), title: post.title, body: post.content,
    distance: Math.round(post.distanceM ?? 0), createdAt: post.createdAt, status: post.status === 'ACTIVE' && !post.closedAt ? '실시간' : '종료됨', views: post.counters.viewCount,
    reactions: { '저도 궁금해요': counts.CURIOUS, '지금도 그래요': counts.STILL_HAPPENING, '도움 됐어요': counts.HELPFUL, '이제 끝났어요': counts.ENDED },
    myReactions: post.myReaction ? [postReactionFromCode(post.myReaction)] : [],
    imageUrl: post.media.find((media) => media.type === 'IMAGE')?.url, reach: ([150, 250, 350] as const).find((value) => value === post.radiusM),
  }
}

export function toComment(comment: CommentResponse): Comment {
  const counts = comment.reactionCounts ?? { HELPFUL: 0, AGREE: 0, DIFFERENT: 0 }
  return {
    id: comment.commentId, boardId: comment.postId, authorId: String(comment.authorId), authorName: comment.authorNickname ?? '알 수 없음', body: comment.content,
    imageUrl: comment.media[0]?.url, createdAt: comment.createdAt, verified: comment.verified, parentId: comment.parentCommentId ?? undefined,
    reactions: { '도움돼요': counts.HELPFUL, '맞아요': counts.AGREE, '정보가 달라요': counts.DIFFERENT },
    myReactions: comment.myReaction ? [commentReactionFromCode(comment.myReaction)] : [],
  }
}
