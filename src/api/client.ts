import { API_BASE_URL } from './config'
import { clearSession, readSession, saveSession } from './session'

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
      clearSession()
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
  const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
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
  try {
    return await send<T>(method, path, options)
  } catch (error) {
    // 토큰이 끝났으면 한 번 갱신하고 다시 보낸다
    if (error instanceof ApiError && error.status === 401 && options.auth !== false && readSession() && await refreshOnce()) return send<T>(method, path, options)
    throw error
  }
}
