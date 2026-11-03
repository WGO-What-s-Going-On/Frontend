// 백엔드 연동 설정. .env.local에 주소가 있으면 실제 서버, 없으면 지금처럼 목업으로 동작한다 (.env.example 참고)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
export const apiEnabled = API_BASE_URL !== ''
// 실시간(WebSocket) 주소. HTTP와 호스트가 다르다. 비우면 실시간 없이 HTTP만 쓴다
export const WS_URL = import.meta.env.VITE_WS_URL ?? ''

// 카카오 지도 JavaScript 키 (REST 키와 다름). 비우면 그림 지도를 쓴다. Kakao Developers > 플랫폼 > Web에 접속 주소 등록 필요
export const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_JS_KEY ?? ''
// 카카오 인가 요청의 client_id. REST 키가 없으면 같은 앱의 JavaScript 키를 쓴다
// (카카오 JS SDK 로그인과 같은 방식: 인가는 JavaScript 키, 토큰 교환은 백엔드가 REST 키로)
export const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_REST_API_KEY || KAKAO_MAP_KEY
// 카카오 로그인 후 돌아올 주소. 백엔드 KAKAO_REDIRECT_URI · Kakao Developers 등록 주소와 똑같아야 한다
export const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI ?? `${window.location.origin}/auth/kakao/callback`
export const kakaoEnabled = apiEnabled && KAKAO_CLIENT_ID !== ''

// 기능별로 실제 서버를 쓸지. 서버에서 막혀 있는 기능은 목업으로 두고, 풀리는 대로 켠다 (docs/api-integration.md 현황표)
export const serverFeatures = {
  // 로그인 · 약관 · 닉네임 · 내 정보: 연결됨
  users: apiEnabled,
  // 게시글 · 댓글 · 공감 · 투표 · 위치 · 알림 · 활동: .env.local의 VITE_SERVER_POSTS=true로 켠다 (실제 로그인 확인 전에는 꺼 둠)
  posts: apiEnabled && import.meta.env.VITE_SERVER_POSTS === 'true',
}
