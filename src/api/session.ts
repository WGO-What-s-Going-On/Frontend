// 로그인 토큰 보관 (localStorage). 목업 상태(wgo-mockup-state-v1)와 따로 둔다
export const SESSION_KEY = 'wgo-auth-session'

export interface Session {
  accessToken: string
  refreshToken: string
  // accessToken이 끝나는 시각 (ms)
  expiresAt: number
  userId: string
}

export function readSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

export function saveSession(session: Session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* 저장 못 해도 이번 실행 동안은 메모리 값으로 동작 */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* 지울 게 없음 */ }
}

export function sessionFromTokens(tokens: { accessToken: string; refreshToken: string; expiresIn: number }, userId: string): Session {
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: Date.now() + tokens.expiresIn * 1000, userId }
}

// 개발용 테스트 토큰: 카카오 로그인이 열리기 전에 .env.local의 VITE_DEV_ACCESS_TOKEN으로 세션을 채운다.
// 개발 서버(npm run dev)에서만 동작하고 배포 빌드 · iOS 앱 번들에는 들어가지 않는다
if (import.meta.env.DEV && import.meta.env.VITE_DEV_ACCESS_TOKEN && !readSession()) {
  try {
    const token = import.meta.env.VITE_DEV_ACCESS_TOKEN
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub: string; exp: number }
    saveSession({ accessToken: token, refreshToken: '', expiresAt: payload.exp * 1000, userId: payload.sub })
  } catch { /* 형식이 틀린 토큰은 무시하고 목업으로 */ }
}
