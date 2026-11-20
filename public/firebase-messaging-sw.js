/* 웹 푸시 알림 (PWA). 앱이 꺼져 있거나 화면이 안 보일 때 온 알림을 띄우고, 누르면 해당 게시글을 연다.
   Firebase 설정은 공개 값이라 등록할 때 주소 뒤에 붙여 넘긴다 (src/api/webPush.ts) */
const params = new URL(self.location.href).searchParams

// 알림 누름: 서버 data.targetId(게시글 ID)가 있으면 그 게시글, 없으면 알림 화면
const targetUrl = (notification) => {
  const data = (notification.data && (notification.data.FCM_MSG && notification.data.FCM_MSG.data)) || notification.data || {}
  return data.targetId && data.actionPath !== '/notifications' ? `/boards/${encodeURIComponent(data.targetId)}` : '/alerts'
}

// 이 워커는 알림과 사진 캐시만 다룬다 (화면 · 스크립트 요청은 건드리지 않는다). 새 버전이 오면 기다리지 않고 바로 바꾼다
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// 사진 캐시: 게시물 · 프로필 사진은 볼 때마다 서명이 바뀐 새 주소(몇 분 유효)로 와서 브라우저가 같은 사진으로 알아보지 못하고,
// 프로필 사진은 저장 금지(no-store)라 매번 처음부터 받았다. 사진 파일 경로는 올릴 때마다 새로 생기고 바뀌지 않으므로
// 서명(?X-Goog-...)을 뗀 경로로 한 번 받은 사진을 기기에 두고 바로 꺼내 쓴다. 만료된 주소여도 받아 둔 사진이면 보인다.
// 응답을 읽을 수 있을 때(저장소 CORS 허용 주소)만, 정상 이미지일 때만 저장한다. 오래된 것부터 지워 PHOTO_MAX장까지
const PHOTO_CACHE = 'wgo-photos-v1'
const PHOTO_MAX = 400
const isSignedPhoto = (url) => (url.hostname === 'storage.googleapis.com' || url.hostname.endsWith('.storage.googleapis.com')) && url.searchParams.has('X-Goog-Signature')

async function trimPhotos(cache) {
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - PHOTO_MAX))) await cache.delete(key)
}

async function photo(request, key) {
  let cache = null
  try {
    cache = await caches.open(PHOTO_CACHE)
    const hit = await cache.match(key, { ignoreVary: true })
    if (hit) return hit
  } catch { /* 캐시를 못 쓰면 받기만 */ }
  let response
  try {
    response = await fetch(request.url, { mode: 'cors', credentials: 'omit' })
  } catch {
    // 응답을 읽을 수 없는 주소(CORS 미허용): 예전처럼 그냥 받는다
    return fetch(request)
  }
  if (cache && response.ok && (response.headers.get('content-type') || '').startsWith('image/')) {
    const saved = response.clone()
    cache.put(key, saved).then(() => trimPhotos(cache)).catch(() => {})
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  let url
  try { url = new URL(request.url) } catch { return }
  if (!isSignedPhoto(url)) return
  event.respondWith(photo(request, url.origin + url.pathname))
})

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
