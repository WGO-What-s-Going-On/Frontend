// 로그인 토큰 보관 (localStorage). 목업 상태(wgo-mockup-state-v1)와 따로 둔다
const SESSION_KEY = 'wgo-auth-session'

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
