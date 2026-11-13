import { api } from './client'
import { KAKAO_CLIENT_ID, KAKAO_REDIRECT_URI } from './config'
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

// 로그인 CSRF 방지: 인가 요청마다 임의 state를 만들어 두고, 돌아온 state가 같을 때만 code를 쓴다
const KAKAO_STATE_KEY = 'wgo-kakao-state'

// 카카오 인가 화면 주소. 로그인 후 KAKAO_REDIRECT_URI?code=...&state=... 로 돌아온다
export function kakaoAuthorizeUrl() {
  const state = crypto.randomUUID()
  try { sessionStorage.setItem(KAKAO_STATE_KEY, state) } catch { /* 저장 못 하면 돌아와서 state 확인에 실패해 다시 로그인 */ }
  const url = new URL('https://kauth.kakao.com/oauth/authorize')
  url.searchParams.set('client_id', KAKAO_CLIENT_ID)
  url.searchParams.set('redirect_uri', KAKAO_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  return url.toString()
}

// 돌아온 state가 이 브라우저에서 보낸 것인지 (한 번 쓰면 지운다)
export function consumeKakaoState(state: string | null) {
  let saved: string | null = null
  try { saved = sessionStorage.getItem(KAKAO_STATE_KEY); sessionStorage.removeItem(KAKAO_STATE_KEY) } catch { /* 없음 */ }
  return Boolean(state && saved && state === saved)
}

// 인가 코드로 로그인(또는 가입). 토큰을 저장하고 온보딩이 필요한지 돌려준다.
// redirectUri: 인가 때 쓴 돌아올 주소. 서버가 허용 목록(로컬 · 배포 · 앱)과 맞춰 보고 같은 주소로 카카오 토큰을 받는다
export async function loginWithKakao(authorizationCode: string) {
  const result = await api<KakaoLoginResponse>('POST', '/api/v1/auth/kakao', { body: { authorizationCode, redirectUri: KAKAO_REDIRECT_URI }, auth: false })
  saveSession(sessionFromTokens(result, result.userId))
  return result
}

// 서버 세션을 끊고 토큰을 지운다. 서버 요청이 실패해도 이 기기에서는 로그아웃한다
export async function logout() {
  if (readSession()) await api('POST', '/api/v1/auth/logout').catch(() => undefined)
  clearSession()
}
