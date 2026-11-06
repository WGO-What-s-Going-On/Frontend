import { API_BASE_URL } from './config'
import { SESSION_KEY, clearSession, readSession, saveSession } from './session'

// 서버 오류. Gateway 오류는 code · message · requestId, 하위 서비스 오류는 statusCode · message · error 모양이라 둘 다 받는다
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public requestId?: string) {
    super(message)
  }
}

interface RequestOptions {
  body?: unknown
  query?: Record<string, string | number | undefined>
  // 로그인 · 갱신 · 약관 · 닉네임 확인은 토큰 없이 부른다
  auth?: boolean
}

// 갱신까지 실패해 로그인이 끝났을 때 앱에 알리는 이벤트 (AppContext가 로그인 화면으로 보낸다)
export const SESSION_EXPIRED_EVENT = 'wgo:session-expired'

// 다른 탭에서 로그아웃 · 탈퇴하거나 갱신 실패로 세션이 지워지면 이 탭도 로그인 화면으로 (안 그러면 열린 화면의 타이머가 헤더 없이 요청한다)
window.addEventListener('storage', (event) => {
  if (event.key === SESSION_KEY && !event.newValue) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
})

// 동시에 여러 요청이 401을 받아도 갱신은 한 번만 (이전 refreshToken 재사용 금지)
let refreshing: Promise<boolean> | null = null
function refreshOnce() {
  refreshing ??= (async () => {
    const session = readSession()
    if (!session) return false
    try {
      const tokens = await send<{ accessToken: string; refreshToken: string; expiresIn: number }>('POST', '/api/v1/auth/refresh', { body: { refreshToken: session.refreshToken }, auth: false })
      saveSession({ ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: Date.now() + tokens.expiresIn * 1000 })
      return true
    } catch {
      // 다른 탭이 먼저 갱신해 refreshToken이 바뀌었으면(이전 토큰은 재사용 불가) 그 세션을 그대로 쓴다
      const latest = readSession()
      if (latest && latest.refreshToken !== session.refreshToken) return true
      clearSession()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function send<T>(method: string, path: string, { body, query, auth = true }: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`)
  Object.entries(query ?? {}).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)) })
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const session = auth ? readSession() : null
  if (session) headers.Authorization = `Bearer ${session.accessToken}`
  // 로그인 · 갱신 응답이 WebSocket용 인증 쿠키(wgo_access_token)를 심으므로 쿠키를 함께 주고받는다 (HTTP 인증은 계속 Bearer)
  const response = await fetch(url, { method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body) })
  if (response.status === 204) return undefined as T
  const text = await response.text()
  // 하위 서비스 응답은 빈 body나 JSON이 아닐 수 있다
  let data: unknown = undefined
  try { data = text ? JSON.parse(text) : undefined } catch { data = text }
  if (!response.ok) {
    const error = (data ?? {}) as { code?: string; error?: string; message?: string; requestId?: string }
    const apiError = new ApiError(response.status, error.code ?? error.error ?? `HTTP_${response.status}`, error.message ?? response.statusText, error.requestId)
    // 연동 이슈 기록용 (docs/api-integration.md): 상태 · 코드 · requestId만 남기고 토큰은 남기지 않는다
    console.warn(`[API] ${method} ${path} → ${apiError.status} ${apiError.code}: ${apiError.message}${apiError.requestId ? ` (requestId ${apiError.requestId})` : ''}`)
    throw apiError
  }
  return data as T
}

export async function api<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  // 로그인이 필요한 요청인데 세션이 없으면 보내지 않는다 (서버는 쿠키만으로 HTTP를 인증하지 않아 헤더 없이 가면 401 AUTH_TOKEN_MISSING)
  if (options.auth !== false && !readSession()) throw new ApiError(401, 'SESSION_MISSING', '로그인이 필요해요.')
  try {
    return await send<T>(method, path, options)
  } catch (error) {
    // 토큰이 끝났으면 한 번 갱신하고 다시 보낸다
    if (error instanceof ApiError && error.status === 401 && options.auth !== false && readSession() && await refreshOnce()) return send<T>(method, path, options)
    throw error
  }
}
