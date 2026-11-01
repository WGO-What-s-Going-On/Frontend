import { api } from './client'

export interface MeResponse {
  userId: string
  nickname: string
  // 본인 조회에만 포함 (다른 사용자에게 공개하지 않음)
  realName: string | null
  profileImageKey: string | null
  status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWAL_PENDING' | 'WITHDRAWN'
  onboardingRequired: boolean
  createdAt: string
}

export interface Term {
  termId: string
  code: string
  version: string
  required: boolean
  documentUrl: string
  effectiveAt: string
}

export const getMe = () => api<MeResponse>('GET', '/api/v1/users/me')
export const updateMe = (input: { nickname?: string; realName?: string | null; profileImageKey?: string | null }) => api<MeResponse>('PATCH', '/api/v1/users/me', { body: input })
export const getTerms = () => api<{ terms: Term[] }>('GET', '/api/v1/terms', { auth: false }).then((result) => result.terms)
export const consentTerms = (termIds: string[]) => api<{ termIds: string[] }>('POST', '/api/v1/users/me/term-consents', { body: { termIds } })
// 서버는 지금 중복만 확인한다 (글자 규칙은 domain/nickname.ts에서 먼저 확인)
export const checkNickname = (nickname: string) => api<{ available: boolean; reason: 'DUPLICATED' | null }>('GET', '/api/v1/users/nickname/availability', { query: { nickname }, auth: false })
export const requestWithdrawal = () => api<unknown>('POST', '/api/v1/users/me/withdrawal')
// 내가 받은 뱃지 (회수된 뱃지는 빠진다)
export const getMyBadges = () => api<{ badges: { badgeId: string; code: string; name: string; description: string | null; imageKey: string | null; grantedAt: string }[] }>('GET', '/api/v1/users/me/badges').then((result) => result.badges)

// 필수 약관 code → 화면 이름
export const termLabel: Record<string, string> = { SERVICE: '서비스 이용약관', PRIVACY_COLLECTION_USE: '개인정보 수집 · 이용 동의', LOCATION: '위치정보 이용약관' }

// 차단: 차단한 사용자의 글 · 댓글은 프론트에서 숨긴다
export const getBlocks = (cursor?: string) => api<{ items: { userId: string; nickname: string; createdAt: string }[]; nextCursor: string | null }>('GET', '/api/v1/users/me/blocks', { query: { cursor } })
export const blockUser = (userId: string) => api<void>('PUT', '/api/v1/users/me/blocks', { body: { userId } })
export const unblockUser = (userId: string) => api<void>('DELETE', '/api/v1/users/me/blocks', { body: { userId } })
