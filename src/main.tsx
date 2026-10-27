import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter></React.StrictMode>,
)
