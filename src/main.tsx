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
