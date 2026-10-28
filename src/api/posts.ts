import { api } from './client'
import type { Board, Category, Comment, CommentReaction, PostReaction, Reach } from '../types/domain'

// 게시글 · 댓글 · 공감 · 투표 API (staging은 백엔드 사용자 인증 연결 전이라 아직 503).
// 화면은 아직 목업 데이터를 쓰고, serverFeatures.posts를 켜면 여기 함수로 바꿔 끼운다 (docs/api-integration.md)

// 우리 화면 이름 ↔ 서버 코드. 카테고리 코드는 백엔드와 아직 합의 전이라 임시 값
export const categoryCode: Record<Category, string> = { '긴급 사고': 'EMERGENCY', '도움 요청': 'HELP', '동네 소식': 'NEWS', '일상 불편': 'ETC' }
export const postReactionCode: Record<PostReaction, 'CURIOUS' | 'STILL_HAPPENING' | 'HELPFUL' | 'ENDED'> = { '저도 궁금해요': 'CURIOUS', '지금도 그래요': 'STILL_HAPPENING', '도움 됐어요': 'HELPFUL', '이제 끝났어요': 'ENDED' }
export const commentReactionCode: Record<CommentReaction, 'HELPFUL' | 'AGREE' | 'DIFFERENT'> = { '도움돼요': 'HELPFUL', '맞아요': 'AGREE', '정보가 달라요': 'DIFFERENT' }

export interface PostResponse {
  postId: string
  authorId: number
  category: string
  title: string
  content: string
  status: 'ACTIVE' | 'EXPIRED' | 'DELETED'
  locationSnapshot: { latitude: number; longitude: number }
  radiusM: number
  counters: { viewCount: number; commentCount: number; reactionCount: number; participantCount: number }
  media: { mediaId: string; type: 'IMAGE' | 'VIDEO'; url: string; expiresAt: string }[]
  createdAt: string
  expiresAt: string
}

export interface CommentResponse {
  commentId: string
  postId: string
  authorId: number
  content: string
  status: 'ACTIVE' | 'DELETED'
  reactionCounts?: { HELPFUL: number; AGREE: number; DIFFERENT: number }
  media: { mediaId: string; url: string }[]
  createdAt: string
}

export interface VoteResponse {
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'NONE'
  candidates: { commentId: string; content: string; votes: number }[]
  winner: { commentId: string; content: string; votes: number } | null
  mySelection: { commentId: string } | null
}

export interface DraftInput { title: string; content: string; category: Category; latitude: number; longitude: number; radiusM: Reach; mediaIds?: string[] }

const draftBody = (draft: DraftInput) => ({ ...draft, category: categoryCode[draft.category] })

export const createPost = (draft: DraftInput) => api<PostResponse>('POST', '/api/v1/posts', { body: draftBody(draft) })
// 비슷한 글: 서버는 150m · 최근 24시간 안에서 찾는다 (limit 1~10)
export const findSimilarPosts = (draft: DraftInput) => api<{ items: { postId: string; title: string; excerpt: string; category: string; distanceM: number; createdAt: string }[]; checkStatus: 'completed' | 'partial' }>('POST', '/api/v1/posts/similar', { body: { ...draftBody(draft), limit: 3 } })
export const getPost = (postId: string) => api<PostResponse>('GET', `/api/v1/posts/${encodeURIComponent(postId)}`)
export const deletePost = (postId: string) => api<void>('DELETE', `/api/v1/posts/${encodeURIComponent(postId)}`)
export const getComments = (postId: string, cursor?: string) => api<{ comments: CommentResponse[]; nextCursor: string | null }>('GET', `/api/v1/posts/${encodeURIComponent(postId)}/comments`, { query: { limit: 100, cursor } })
export const createComment = (postId: string, content: string, mediaIds?: string[]) => api<CommentResponse>('POST', `/api/v1/posts/${encodeURIComponent(postId)}/comments`, { body: { content, mediaIds } })
export const deleteComment = (postId: string, commentId: string) => api<void>('DELETE', `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`)
export const reactToPost = (postId: string, reaction: PostReaction) => api<unknown>('POST', `/api/v1/posts/${encodeURIComponent(postId)}/reactions`, { body: { type: postReactionCode[reaction] } })
export const cancelPostReaction = (postId: string, reaction: PostReaction) => api<void>('DELETE', `/api/v1/posts/${encodeURIComponent(postId)}/reactions/${postReactionCode[reaction]}`)
export const reactToComment = (postId: string, commentId: string, reaction: CommentReaction) => api<unknown>('POST', `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/reactions`, { body: { type: commentReactionCode[reaction] } })
export const cancelCommentReaction = (postId: string, commentId: string, reaction: CommentReaction) => api<void>('DELETE', `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/reactions/${commentReactionCode[reaction]}`)
export const getVote = (postId: string) => api<VoteResponse>('GET', `/api/v1/posts/${encodeURIComponent(postId)}/vote`)
export const castVote = (postId: string, commentId: string) => api<VoteResponse>('PUT', `/api/v1/posts/${encodeURIComponent(postId)}/vote`, { body: { commentId } })
export const cancelVote = (postId: string) => api<void>('DELETE', `/api/v1/posts/${encodeURIComponent(postId)}/vote`)
export const joinPost = (postId: string) => api<unknown>('POST', `/api/v1/posts/${encodeURIComponent(postId)}/participants`)
export const updateLocation = (latitude: number, longitude: number) => api<{ updatedAt: string }>('PUT', '/api/v1/location', { body: { latitude, longitude } })

// 서버 응답 → 화면 데이터. 서버에 없는 값(작성자 닉네임, 반응별 개수, 내 공감, 답글)은 비워 둔다 (이슈 문서 참고)
const categoryFromCode = (code: string): Category => (Object.entries(categoryCode).find(([, value]) => value === code)?.[0] as Category | undefined) ?? '일상 불편'

export function toBoard(post: PostResponse, distance: number): Board {
  return {
    id: post.postId, authorId: String(post.authorId), authorName: '이웃', category: categoryFromCode(post.category), title: post.title, body: post.content,
    distance, createdAt: post.createdAt, status: post.status === 'ACTIVE' ? '실시간' : '종료됨', views: post.counters.viewCount,
    reactions: { '저도 궁금해요': 0, '지금도 그래요': 0, '도움 됐어요': 0, '이제 끝났어요': 0 },
    imageUrl: post.media.find((media) => media.type === 'IMAGE')?.url, reach: ([150, 250, 350] as const).find((value) => value === post.radiusM),
  }
}

export function toComment(comment: CommentResponse): Comment {
  const counts = comment.reactionCounts ?? { HELPFUL: 0, AGREE: 0, DIFFERENT: 0 }
  return {
    id: comment.commentId, boardId: comment.postId, authorId: String(comment.authorId), authorName: '이웃', body: comment.content,
    imageUrl: comment.media[0]?.url, createdAt: comment.createdAt, verified: false,
    reactions: { '도움돼요': counts.HELPFUL, '맞아요': counts.AGREE, '정보가 달라요': counts.DIFFERENT },
  }
}
