import { useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'

// 홈 화면에 추가: 홈 화면 앱으로 열어야 알림(웹 푸시)을 받고 주소창 없이 앱처럼 열린다.
// 안드로이드 Chrome은 설치 창을 직접 띄울 수 있어서(beforeinstallprompt) 앱을 열 때부터 받아 둔다 (main.tsx에서 불러온다).
// 기본 동작(Chrome 자체 설치 안내)은 막지 않는다
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => { deferred = event as InstallPromptEvent; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; notify() })
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

// 안드로이드 Chrome에서 바로 띄울 수 있는 설치 창 (없으면 null → 메뉴로 안내)
export function useInstallPrompt() {
  const event = useSyncExternalStore(subscribe, () => deferred)
  const justInstalled = useSyncExternalStore(subscribe, () => installed)
  const install = async () => {
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') { deferred = null; notify() }
  }
  return { canInstall: Boolean(event), install, justInstalled }
}

// 지금 어디서 열었는지: 앱(Capacitor) · 홈 화면 앱 · iPhone · 안드로이드 · 카카오톡 같은 앱 안 브라우저
export function openedFrom() {
  const ua = navigator.userAgent
  return {
    native: Capacitor.isNativePlatform(),
    standalone: window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    ios: /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1),
    android: /Android/i.test(ua),
    inApp: /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\//i.test(ua),
  }
}

// 홈 화면에 추가 안내 시트를 띄울 때: 브라우저 · 홈 화면 앱 모두 (이미 추가했어도 띄운다). 앱(iOS · 안드로이드 설치 앱)만 제외
export function shouldSuggestHomeScreen() {
  return !openedFrom().native
}
