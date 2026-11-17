/* 웹 푸시 알림 (PWA). 앱이 꺼져 있거나 화면이 안 보일 때 온 알림을 띄우고, 누르면 해당 게시글을 연다.
   Firebase 설정은 공개 값이라 등록할 때 주소 뒤에 붙여 넘긴다 (src/api/webPush.ts) */
const params = new URL(self.location.href).searchParams

// 알림 누름: 서버 data.targetId(게시글 ID)가 있으면 그 게시글, 없으면 알림 화면
const targetUrl = (notification) => {
  const data = (notification.data && (notification.data.FCM_MSG && notification.data.FCM_MSG.data)) || notification.data || {}
  return data.targetId && data.actionPath !== '/notifications' ? `/boards/${encodeURIComponent(data.targetId)}` : '/alerts'
}

// 이 워커는 알림만 다룬다(fetch 처리 없음). 새 버전이 오면 기다리지 않고 바로 바꾼다
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// 갈 곳 저장: iOS 홈 화면 앱은 백그라운드 앱을 앞으로 가져오는 focus()가 실패하거나(그러면 아래 메시지도 못 보냄),
// 꺼진 앱을 주소 대신 첫 화면으로 여는 경우가 있다. 앱이 다시 보일 때 여기서 꺼내 간다 (src/api/notificationOpen.ts)
const OPEN_CACHE = 'wgo-open'
const OPEN_KEY = '/__wgo-open'
const remember = async (url) => {
  try { await (await caches.open(OPEN_CACHE)).put(OPEN_KEY, new Response(JSON.stringify({ url, at: Date.now() }))) } catch { /* 메시지 · 주소로만 간다 */ }
}

// Firebase의 기본 클릭 처리(링크 없으면 아무것도 안 함)보다 먼저 등록해야 우리가 처리한다
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = targetUrl(event.notification)
  event.stopImmediatePropagation()
  event.waitUntil((async () => {
    await remember(url)
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (open) {
      // 열려 있는 앱으로 와서 그 안에서 화면만 옮긴다. focus()가 실패해도 메시지는 보낸다
      try { await open.focus() } catch { /* iOS: 백그라운드 앱 */ }
      open.postMessage({ type: 'wgo:open', url })
      return
    }
    await self.clients.openWindow(url)
  })())
})

importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})
// 서버 알림에는 notification(제목 · 내용)이 있어서 Firebase가 알림을 직접 띄운다
firebase.messaging()
