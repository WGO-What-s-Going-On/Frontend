// 백엔드 연동 설정. .env.local에 주소가 있으면 실제 서버, 없으면 지금처럼 목업으로 동작한다 (.env.example 참고)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
export const apiEnabled = API_BASE_URL !== ''

export const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? ''
// 카카오 로그인 후 돌아올 주소. 백엔드 KAKAO_REDIRECT_URI · Kakao Developers 등록 주소와 똑같아야 한다
export const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI ?? `${window.location.origin}/auth/kakao/callback`
export const kakaoEnabled = apiEnabled && KAKAO_REST_API_KEY !== ''

// 기능별로 실제 서버를 쓸지. 서버에서 막혀 있는 기능은 목업으로 두고, 풀리는 대로 켠다 (docs/api-integration.md 현황표)
export const serverFeatures = {
  // 로그인 · 약관 · 닉네임 · 내 정보: 연결됨
  users: apiEnabled,
  // 게시글 · 댓글 · 공감 · 투표 · 위치 · 알림: API 준비됨, 실제 로그인으로 확인한 뒤 켠다 (토큰 없이는 401)
  posts: false,
}
