/* 웹 푸시 알림 (PWA). 앱이 꺼져 있거나 화면이 안 보일 때 온 알림을 띄우고, 누르면 해당 게시글을 연다.
   Firebase 설정은 공개 값이라 등록할 때 주소 뒤에 붙여 넘긴다 (src/api/webPush.ts) */
const params = new URL(self.location.href).searchParams

// 알림 누름: 서버 data.targetId(게시글 ID)가 있으면 그 게시글, 없으면 알림 화면
const targetUrl = (notification) => {
  const data = (notification.data && (notification.data.FCM_MSG && notification.data.FCM_MSG.data)) || notification.data || {}
  return data.targetId && data.actionPath !== '/notifications' ? `/boards/${encodeURIComponent(data.targetId)}` : '/alerts'
}

// Firebase의 기본 클릭 처리(링크 없으면 아무것도 안 함)보다 먼저 등록해야 우리가 처리한다
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = targetUrl(event.notification)
  event.stopImmediatePropagation()
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (open) {
      // 열려 있는 앱으로 와서 그 안에서 화면만 옮긴다 (src/api/webPush.ts가 받는다)
      await open.focus()
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
