import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { AppProvider } from './context/AppContext'
import './styles.css'
import './reach-fix.css'
import './prototype.css'
import './flow-only.css'
import './ux-exploration.css'
import './design-system.css'
import './safe-area.css'
import './dark.css'

// 개발 서버에서만: 주소 끝에 ?reset 을 붙이면 저장된 목업 데이터(로그인·약관·글·설정)를 지우고 첫 화면부터 다시 본다
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('reset')) {
  localStorage.clear()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
}

// 앱(Capacitor)인지 브라우저인지: 브라우저는 주소창 · 도구 막대 때문에 보이는 높이가 짧아 몇몇 화면만 따로 맞춘다 (safe-area.css)
document.documentElement.dataset.shell = Capacitor.isNativePlatform() ? 'app' : 'browser'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter></React.StrictMode>,
)

// 시작 화면(index.html #launch-splash) 닫기: 첫 화면이 그려진 뒤, 앱을 연 지 최소 1.5초는 보여 주고 서서히 사라진다
function hideLaunchSplash() {
  const root = document.documentElement
  const splash = document.getElementById('launch-splash')
  if (!splash || !root.classList.contains('launching')) return
  window.setTimeout(() => {
    splash.classList.add('leaving')
    window.setTimeout(() => {
      root.classList.remove('launching')
      splash.remove()
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (meta?.dataset.default) meta.content = meta.dataset.default
    }, 280)
  }, Math.max(0, 1500 - performance.now()))
}
requestAnimationFrame(() => requestAnimationFrame(hideLaunchSplash))
