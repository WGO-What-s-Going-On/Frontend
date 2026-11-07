import { Capacitor } from '@capacitor/core'
import type { Messaging } from 'firebase/messaging'
import { api } from './client'

// 웹 푸시 알림 (PWA). iOS · 안드로이드 앱은 src/api/push.ts(앱 푸시), 브라우저 · 홈 화면 앱은 여기.
// - iOS는 Safari 공유 → '홈 화면에 추가'로 연 앱에서만 받을 수 있다 (Safari 탭에서는 안 됨)
// - 권한은 사용자가 버튼을 눌렀을 때만 물을 수 있다 (알림 설정의 '이 기기 푸시 알림')
// - Firebase 등록 토큰을 서버에 올린다: PUT /api/v1/notifications/push-subscriptions { token, platform: 'web' }
// - 알림 표시 · 누름은 public/firebase-messaging-sw.js(서비스 워커), 앱을 보고 있을 때 온 알림은 onReceive
const env = import.meta.env
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
}
const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY ?? ''
const TOKEN_KEY = 'wgo-web-push-token'
// 알림 설정에서 직접 끈 기기 (브라우저 권한은 남아 있어도 다시 켜지 않는다)
const OFF_KEY = 'wgo-web-push-off'

const configured = Object.values(config).every(Boolean) && VAPID_KEY !== ''
const browserCanPush = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const isIOS = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

// on: 받는 중 / off: 켤 수 있음 / denied: 브라우저에서 막음 / needs-install: 아이폰인데 홈 화면 앱이 아님 / unsupported: 앱(앱 푸시 사용) · 설정 없음 · 지원 안 하는 브라우저
export type WebPushState = 'on' | 'off' | 'denied' | 'needs-install' | 'unsupported'

const savedToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
const saveToken = (token: string | null) => {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY) } catch { /* 다음 실행 때 다시 받는다 */ }
}
const turnedOff = () => { try { return localStorage.getItem(OFF_KEY) === '1' } catch { return false } }
const setTurnedOff = (off: boolean) => { try { if (off) localStorage.setItem(OFF_KEY, '1'); else localStorage.removeItem(OFF_KEY) } catch { /* 없음 */ } }

export function webPushState(): WebPushState {
  if (Capacitor.isNativePlatform() || !configured) return 'unsupported'
  if (isIOS && !isStandalone()) return 'needs-install'
  if (!browserCanPush) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.permission === 'granted' && !turnedOff() ? 'on' : 'off'
}

// Firebase는 웹 푸시를 쓸 때만 불러온다 (첫 화면 용량을 늘리지 않게)
let messaging: Promise<{ messaging: Messaging; registration: ServiceWorkerRegistration }> | null = null
function loadMessaging() {
  messaging ??= (async () => {
    const [{ initializeApp }, { getMessaging }] = await Promise.all([import('firebase/app'), import('firebase/messaging')])
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config)}`, { scope: '/' })
    return { messaging: getMessaging(initializeApp(config)), registration }
  })().catch((error) => { messaging = null; throw error })
  return messaging
}

async function upload(token: string) {
  const previous = savedToken()
  if (previous === token) return
  await api('PUT', '/api/v1/notifications/push-subscriptions', { body: { token, platform: 'web' } })
  saveToken(token)
  if (previous) api('DELETE', '/api/v1/notifications/push-subscriptions', { body: { token: previous } }).catch(() => undefined)
}

async function currentToken() {
  const { messaging: instance, registration } = await loadMessaging()
  const { getToken } = await import('firebase/messaging')
  return getToken(instance, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
}

// 알림 설정의 '켜기' 버튼에서 부른다 (버튼 누름 안에서 권한을 물어야 iOS가 허락한다)
export async function enableWebPush(): Promise<WebPushState> {
  const state = webPushState()
  if (state === 'unsupported' || state === 'needs-install' || state === 'denied') return state
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  try {
    await upload(await currentToken())
  } catch (error) {
    // 토큰 발급 · 등록 실패면 켜진 것으로 남기지 않는다 (다시 누르면 다시 시도)
    setTurnedOff(true)
    throw error
  }
  setTurnedOff(false)
  return 'on'
}

// 알림 설정에서 끄기: 서버에서 이 기기를 빼고, 다음에 앱을 열어도 다시 켜지 않는다
export async function disableWebPush() {
  setTurnedOff(true)
  await unregisterWebPush()
  if (!messaging) return
  const [{ messaging: instance }, { deleteToken }] = await Promise.all([messaging, import('firebase/messaging')])
  await deleteToken(instance).catch(() => undefined)
}

// 로그아웃 · 탈퇴 전에: 서버에서 이 기기 토큰만 뺀다 (다시 로그인하면 켜 둔 상태 그대로 다시 등록)
export async function unregisterWebPush() {
  const token = savedToken()
  saveToken(null)
  if (token) await api('DELETE', '/api/v1/notifications/push-subscriptions', { body: { token } }).catch(() => undefined)
}

let listening = false

// 로그인한 상태로 앱을 열 때: 이미 켜 둔 기기면 토큰을 새로 맞추고(바뀌었으면 다시 등록) 알림 수신 · 누름을 연결한다. 권한은 묻지 않는다
export async function startWebPush({ onReceive, onOpen }: { onReceive: (title?: string) => void; onOpen: (url: string) => void }) {
  if (webPushState() !== 'on') return
  try {
    await upload(await currentToken())
    if (listening) return
    listening = true
    const [{ messaging: instance }, { onMessage }] = await Promise.all([loadMessaging(), import('firebase/messaging')])
    onMessage(instance, (payload) => onReceive(payload.notification?.title))
    // 서비스 워커가 '알림 누름'을 보내 주면 열려 있는 앱 안에서 그 화면으로
    navigator.serviceWorker.addEventListener('message', (event) => { if (event.data?.type === 'wgo:open' && typeof event.data.url === 'string') onOpen(event.data.url) })
  } catch (error) {
    console.warn('[Push] 웹 푸시 등록 실패', error)
  }
}
