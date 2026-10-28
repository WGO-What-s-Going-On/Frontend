/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 백엔드 주소. 비워 두면 지금처럼 목업 데이터로만 동작한다
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_URL?: string
  // 카카오 로그인 (REST API 키 · 로그인 후 돌아올 주소). 비워 두면 목업 로그인
  readonly VITE_KAKAO_REST_API_KEY?: string
  readonly VITE_KAKAO_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
