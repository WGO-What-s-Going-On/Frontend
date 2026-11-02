/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 백엔드 주소. 비워 두면 지금처럼 목업 데이터로만 동작한다
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_URL?: string
  // 카카오 로그인 (REST API 키 · 로그인 후 돌아올 주소). 비워 두면 목업 로그인
  readonly VITE_KAKAO_REST_API_KEY?: string
  readonly VITE_KAKAO_REDIRECT_URI?: string
  // 게시글 · 댓글 · 알림 · 활동 화면을 실제 서버로 ('true'일 때). 로그인 확인 전에는 꺼 둔다
  readonly VITE_SERVER_POSTS?: string
  // 브라우저 위치를 못 받을 때 쓰는 개발용 위치 "위도,경도"
  readonly VITE_DEV_LATLNG?: string
  // 개발 서버 전용 테스트 계정 토큰 (.env.local에만, 커밋 금지)
  readonly VITE_DEV_ACCESS_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
