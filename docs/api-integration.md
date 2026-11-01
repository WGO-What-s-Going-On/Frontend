# 백엔드 연동 기록

- 기준: 2026-11-01 GCP 서버 호출 결과, 백엔드 `docs/contracts/frontend-integration.md`
- HTTP: https://api.136-81-245-176.sslip.io (Swagger `/docs`)
- WebSocket: wss://ws.136-81-245-176.sslip.io/ws/v1
- 기존 AWS(cloudfront) 서버 종료
- 노션 "연동 관련"과 같은 내용

---

## 1. 미해결

| # | 항목 | 확인 결과 | 담당 |
| --- | --- | --- | --- |
| 1-1 | WebSocket origin 차단 | `http://localhost:5173`, `capacitor://localhost` 등 프론트 origin 모두 403 `WS_ORIGIN_FORBIDDEN` | 도현 |
| 1-2 | 카카오 redirect URI | 변경된 `https://api.136-81-245-176.sslip.io/auth/kakao/callback`은 백엔드 주소라 404 | 대준(설정) · 도현(재배포) |
| 1-3 | 카카오 REST API 키 | 프론트 인가 URL의 `client_id`에 필요 | 대준 |
| 1-4 | 테스트 계정 토큰 | 토큰 없이 호출 가능한 API는 4개(`/auth/kakao`, `/auth/refresh`, `/terms`, `/users/nickname/availability`). 나머지 전부 401 | 도현 |
| 1-5 | 약관 데이터 없음 | `GET /api/v1/terms` 200 `{"terms":[]}` | 백엔드 |
| 1-6 | Swagger 응답 스키마 누락 | `/notifications/unread-count`, `/posts/me/level`, `/posts/me/ranking`, `/posts/me/activity` | 백엔드 |
| 1-7 | 댓글 수정 API 없음 | 댓글 ⋯ → 수정 화면 있음, `PATCH /posts/{postId}/comments/{commentId}` 없음 | 백엔드 |

- 1-1: ws-gateway `WS_ALLOWED_ORIGINS`에 프론트 origin 추가 필요. 2-1 쿠키 Domain 설정과 함께 재배포
- 1-2: 카카오 → 프론트 `/auth/kakao/callback`(code 수신) → `POST /api/v1/auth/kakao` 구조라 redirect URI는 프론트 주소여야 함. 개발용 `http://localhost:5173/auth/kakao/callback`을 카카오 콘솔 · 깃헙 환경변수 `KAKAO_REDIRECT_URI`에 동일하게 설정(대준) 후 재배포(도현) 필요
- 1-3: 백엔드 `KAKAO_REST_API_KEY`와 같은 키
- 1-4: 카카오 로그인 해결 전 HTTP 연동 확인용 accessToken 1개 필요. 만료 30분 이상. WebSocket은 로그인 응답 쿠키가 필요해 대상 외
- 1-5: `seed:terms` 미실행. 현재 프론트는 약관 목록이 비면 동의 저장 없이 진행
- 1-6: 응답 형식은 백엔드 코드로 확인해 프론트에 반영함
- 1-7: 현재 프론트는 서버 연동 중 댓글 수정을 막아 둠

---

## 2. 로그인 후 확인할 것

| # | 항목 | 내용 | 담당 |
| --- | --- | --- | --- |
| 2-1 | WebSocket 쿠키 인증 | HTTP(`api.`)와 WebSocket(`ws.`) 호스트가 달라 `wgo_access_token` 쿠키의 `Domain` 설정(`AUTH_COOKIE_DOMAIN`) 필요. localhost ↔ sslip.io는 다른 사이트라 타사 쿠키 차단 가능 | 도현 |
| 2-2 | 행정동 · 랭킹 설정 | `POST_REGION_ENABLED`, Map `KAKAO_LOCAL_REST_API_KEY` 적용 여부 | 도현 |

---

## 3. 해결 확인

Swagger · 백엔드 코드 · GCP 서버 호출 기준. 토큰이 필요한 API는 로그인 이후 확인 예정.

- `GET /terms` 404 → 200
- `GET /notifications` 404 → 토큰 없을 때 401로 정상 라우팅
- 게시글 계열 503 → 토큰 없을 때 401로 정상 응답
- CORS: localhost origin 허용, credentials 허용
- 주변 게시글 목록 `GET /posts/nearby` (정렬 · 카테고리 · 검색 `q` 포함)
- 응답 필드: 작성자 닉네임 · 익명, 반응 종류별 개수, 내 반응, 거리, 종료 시각, 답글 부모 ID, 현장 인증, 실명
- 신규 API: 게시글 수정 · 종료/재개, 신고, 차단, 알림 설정 · 게시판별 알림 · 모두 읽음 · 삭제, 최근 활동, 칭호, 행정동 랭킹, 내 뱃지
- 카테고리 코드 `EMERGENCY` · `HELP` · `NEWS` · `ETC` 확정
- 알림 목록 응답 스키마 추가
- WebSocket 인증: 로그인 · 갱신 응답에서 `wgo_access_token` HttpOnly 쿠키 발급 방식으로 결정
- 약관 code: `SERVICE`, `PRIVACY_COLLECTION_USE`, `LOCATION`
- iOS 앱 카카오 로그인 복귀: 웹 연동 이후 진행으로 정리됨
