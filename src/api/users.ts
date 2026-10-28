import { api } from './client'

export interface MeResponse {
  userId: string
  nickname: string
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
export const updateMe = (input: { nickname?: string; profileImageKey?: string | null }) => api<MeResponse>('PATCH', '/api/v1/users/me', { body: input })
export const getTerms = () => api<{ terms: Term[] }>('GET', '/api/v1/terms', { auth: false }).then((result) => result.terms)
export const consentTerms = (termIds: string[]) => api<{ termIds: string[] }>('POST', '/api/v1/users/me/term-consents', { body: { termIds } })
// 서버는 지금 중복만 확인한다 (글자 규칙은 domain/nickname.ts에서 먼저 확인)
export const checkNickname = (nickname: string) => api<{ available: boolean; reason: 'DUPLICATED' | null }>('GET', '/api/v1/users/nickname/availability', { query: { nickname }, auth: false })
export const requestWithdrawal = () => api<unknown>('POST', '/api/v1/users/me/withdrawal')
