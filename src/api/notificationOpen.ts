import { Capacitor } from '@capacitor/core'

// 웹 푸시 알림을 눌렀을 때 그 알림의 화면(게시글 · 알림함)으로 옮긴다. 갈 곳은 서비스 워커(public/firebase-messaging-sw.js)가 정한다.
// - 앱이 떠 있으면 서비스 워커가 메시지(wgo:open)로 바로 알려 준다
// - iOS 홈 화면 앱은 그 메시지가 안 오거나, 꺼진 앱을 첫 화면으로 여는 경우가 있어서
//   서비스 워커가 저장해 둔 갈 곳을 앱이 보일 때마다 꺼내 본다 (1분 안에 누른 것만)
const CACHE = 'wgo-open'
const KEY = '/__wgo-open'
const FRESH_MS = 60_000
// 서비스 워커가 만드는 주소만 따른다
const allowed = (url: unknown): url is string => typeof url === 'string' && /^\/(boards\/[^/?#]+|alerts)$/.test(url)

async function takeSaved(): Promise<string | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE)
    const saved = await cache.match(KEY)
    if (!saved) return null
    await cache.delete(KEY)
    const { url, at } = await saved.json() as { url?: unknown; at?: number }
    return allowed(url) && typeof at === 'number' && Date.now() - at < FRESH_MS ? url : null
  } catch { return null }
}

// 로그인한 동안 켜 둔다. 끄는 함수를 돌려준다
export function listenNotificationOpen(open: (url: string) => void) {
  if (Capacitor.isNativePlatform()) return () => undefined
  // 메시지와 저장분이 둘 다 오면 한 번만 옮긴다
  let last = { url: '', at: 0 }
  const go = (url: string) => {
    if (window.location.pathname === url || (last.url === url && Date.now() - last.at < 5000)) return
    last = { url, at: Date.now() }
    open(url)
  }
  const check = () => { if (document.visibilityState === 'visible') takeSaved().then((url) => { if (url) go(url) }) }
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== 'wgo:open' || !allowed(event.data.url)) return
    takeSaved().catch(() => undefined)
    go(event.data.url)
  }
  const worker = 'serviceWorker' in navigator ? navigator.serviceWorker : null
  worker?.addEventListener('message', onMessage)
  document.addEventListener('visibilitychange', check)
  window.addEventListener('pageshow', check)
  check()
  return () => {
    worker?.removeEventListener('message', onMessage)
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('pageshow', check)
  }
}
