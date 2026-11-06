import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { api } from './client'

// 앱 푸시 알림 (iOS · 안드로이드 앱에서만). 브라우저는 홈 화면에 추가한 경우에만 웹 푸시가 돼서 쓰지 않는다
// - Firebase 등록 토큰을 서버에 올린다: PUT /api/v1/notifications/push-subscriptions { token, platform }
// - 토큰이 바뀌면 새 토큰을 올리고 예전 토큰은 지운다. 로그아웃 · 탈퇴 때 이 기기 토큰을 지운다
// - Firebase 설정 파일(GoogleService-Info.plist · google-services.json)이 없으면 조용히 건너뛴다
const TOKEN_KEY = 'wgo-push-token'
const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'
export const pushSupported = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('FirebaseMessaging')

// 알림을 눌렀을 때 갈 곳 (서버 data: notificationId · type · targetId(게시글 ID) · actionPath · commentId)
export interface PushTarget {
  postId?: string
  commentId?: string
  toAlerts: boolean
}

const savedToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
const saveToken = (token: string | null) => {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY) } catch { /* 다음 실행 때 다시 받는다 */ }
}

async function upload(token: string) {
  const previous = savedToken()
  await api('PUT', '/api/v1/notifications/push-subscriptions', { body: { token, platform } })
  saveToken(token)
  if (previous && previous !== token) api('DELETE', '/api/v1/notifications/push-subscriptions', { body: { token: previous } }).catch(() => undefined)
}

let listening = false

// 로그인한 뒤 한 번 부른다: 권한을 묻고(처음 한 번), 토큰을 서버에 올리고, 알림 수신 · 누름을 연결한다
export async function startPush({ onReceive, onOpen }: { onReceive: () => void; onOpen: (target: PushTarget) => void }) {
  if (!pushSupported) return
  try {
    let { receive } = await FirebaseMessaging.checkPermissions()
    if (receive === 'prompt' || receive === 'prompt-with-rationale') receive = (await FirebaseMessaging.requestPermissions()).receive
    if (receive !== 'granted') return
    if (!listening) {
      listening = true
      await FirebaseMessaging.addListener('tokenReceived', ({ token }) => { upload(token).catch(() => undefined) })
      // 앱을 보고 있을 때 온 알림: 알림 종 숫자 · 목록을 새로 받는다 (iOS는 배너도 뜬다, capacitor.config의 presentationOptions)
      await FirebaseMessaging.addListener('notificationReceived', () => onReceive())
      await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const data = (notification.data ?? {}) as Record<string, string | undefined>
        onOpen({ postId: data.targetId || undefined, commentId: data.commentId || undefined, toAlerts: !data.targetId || data.actionPath === '/notifications' })
      })
    }
    const { token } = await FirebaseMessaging.getToken()
    if (token) await upload(token)
  } catch (error) {
    // Firebase 설정 파일 없음 · APNs 미설정 등. 푸시만 빠지고 앱은 그대로 쓴다
    console.warn('[Push] 푸시 알림 등록 실패', error)
  }
}

// 로그아웃 · 탈퇴 전에 부른다 (서버 요청에 로그인 토큰이 필요해서 세션을 지우기 전에)
export async function stopPush() {
  if (!pushSupported) return
  const token = savedToken()
  saveToken(null)
  if (token) await api('DELETE', '/api/v1/notifications/push-subscriptions', { body: { token } }).catch(() => undefined)
  await FirebaseMessaging.deleteToken().catch(() => undefined)
}
