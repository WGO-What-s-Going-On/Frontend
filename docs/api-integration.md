# 백엔드 연동 기록

- 기준: 2026-11-01 GCP 서버 호출 결과, 백엔드 `docs/contracts/frontend-integration.md`
- HTTP: https://api.136-81-245-176.sslip.io (Swagger `/docs`)
- WebSocket: wss://ws.136-81-245-176.sslip.io/ws/v1
- 기존 AWS(cloudfront) 서버 종료
- 노션 "연동 관련"과 같은 내용

---

## 1. 미해결

| # | 항목 | 확인 결과 |
| --- | --- | --- |
| 1-1 | WebSocket origin 차단 | `http://localhost:5173`, `capacitor://localhost` 등 프론트 origin 모두 403 `WS_ORIGIN_FORBIDDEN` |
| 1-2 | 카카오 REST API 키 · redirect URI | 프론트 인가 URL의 `client_id`, `redirect_uri`에 필요. 변경된 콜백 주소 미공유 |
| 1-3 | 약관 데이터 없음 | `GET /api/v1/terms` 200 `{"terms":[]}` |
| 1-4 | Swagger 응답 스키마 누락 | `/notifications/unread-count`, `/posts/me/level`, `/posts/me/ranking`, `/posts/me/activity` |
| 1-5 | 댓글 수정 API 없음 | 댓글 ⋯ → 수정 화면 있음, `PATCH /posts/{postId}/comments/{commentId}` 없음 |

- 1-1: ws-gateway `WS_ALLOWED_ORIGINS`에 프론트 origin 추가 필요
- 1-2: 카카오 콘솔 등록 값과 백엔드 토큰 교환 값이 프론트 값과 같아야 함
- 1-3: `seed:terms` 미실행. 현재 프론트는 약관 목록이 비면 동의 저장 없이 진행
- 1-4: 응답 형식은 백엔드 코드로 확인해 프론트에 반영함
- 1-5: 현재 프론트는 서버 연동 중 댓글 수정을 막아 둠

---

## 2. 로그인 후 확인할 것

| # | 항목 | 내용 |
| --- | --- | --- |
| 2-1 | WebSocket 쿠키 인증 | HTTP(`api.`)와 WebSocket(`ws.`) 호스트가 달라 `wgo_access_token` 쿠키의 `Domain` 설정(`AUTH_COOKIE_DOMAIN`) 필요. localhost ↔ sslip.io는 다른 사이트라 타사 쿠키 차단 가능 |
| 2-2 | 행정동 · 랭킹 설정 | `POST_REGION_ENABLED`, Map `KAKAO_LOCAL_REST_API_KEY` 적용 여부 |

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
