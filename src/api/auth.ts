import { api } from './client'
import { KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY } from './config'
import { clearSession, readSession, saveSession, sessionFromTokens } from './session'

interface KakaoLoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  userId: string
  isNewUser: boolean
  onboardingRequired: boolean
  restoredFromWithdrawal: boolean
}

// 카카오 인가 화면 주소. 로그인 후 KAKAO_REDIRECT_URI?code=... 로 돌아온다
export function kakaoAuthorizeUrl() {
  const url = new URL('https://kauth.kakao.com/oauth/authorize')
  url.searchParams.set('client_id', KAKAO_REST_API_KEY)
  url.searchParams.set('redirect_uri', KAKAO_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  return url.toString()
}

// 인가 코드로 로그인(또는 가입). 토큰을 저장하고 온보딩이 필요한지 돌려준다
export async function loginWithKakao(authorizationCode: string) {
  const result = await api<KakaoLoginResponse>('POST', '/api/v1/auth/kakao', { body: { authorizationCode }, auth: false })
  saveSession(sessionFromTokens(result, result.userId))
  return result
}

// 서버 세션을 끊고 토큰을 지운다. 서버 요청이 실패해도 이 기기에서는 로그아웃한다
export async function logout() {
  if (readSession()) await api('POST', '/api/v1/auth/logout').catch(() => undefined)
  clearSession()
}
