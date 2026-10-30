# 백엔드 연동 기록

- 기준: 2026-10-30 staging 호출 결과, 백엔드 `docs/contracts/frontend-integration.md`
- Swagger: https://d35lxgeutzw8c6.cloudfront.net/docs
- 노션 "연동 관련"과 같은 내용

---

## 1. 미해결

| # | 항목 | 확인 결과 |
| --- | --- | --- |
| 1-1 | `GET /api/v1/terms` 404 | `GATEWAY_ROUTE_NOT_FOUND` (10-28에는 200). requestId `acd95b2b-b79d-451d-8d99-dcde420c88b8` |
| 1-2 | `GET /api/v1/notifications` 404 | `GATEWAY_ROUTE_NOT_FOUND`. 하위 경로(`/unread-count`, `/settings`)는 401로 정상 라우팅. requestId `ec3274dc-a66b-41e2-9816-bc1d3695563a` |
| 1-3 | 카카오 REST API 키 | 프론트 인가 URL의 `client_id`에 필요. 키가 없어 실제 로그인 불가 |
| 1-4 | Swagger 응답 스키마 누락 | `/notifications/unread-count`, `/posts/me/level`, `/posts/me/ranking`, `/posts/me/activity` |
| 1-5 | 댓글 수정 API 없음 | 댓글 ⋯ → 수정 화면 있음, `PATCH /posts/{postId}/comments/{commentId}` 없음 |

- 1-1: 약관 동의 화면에서 필수 약관 목록 조회 불가
- 1-2: gateway allowlist 코드에는 경로 있음, staging 배포 버전 확인 필요
- 1-3: 실제 로그인이 안 되어 토큰이 필요한 API 전체 미확인
- 1-4: 응답 형식은 백엔드 코드로 확인해 프론트에 반영함
- 1-5: 현재 프론트는 서버 연동 중 댓글 수정을 막아 둠

---

## 2. 로그인 후 확인할 것

| # | 항목 | 내용 |
| --- | --- | --- |
| 2-1 | WebSocket 쿠키 인증 | localhost ↔ cloudfront는 다른 사이트라 브라우저 타사 쿠키 차단 시 `wgo_access_token` 쿠키 미전송 가능 |
| 2-2 | 행정동 · 랭킹 설정 | `POST_REGION_ENABLED`, Map `KAKAO_LOCAL_REST_API_KEY` 적용 여부 |
| 2-3 | 약관 데이터 | `seed:terms` 실행 여부, 약관 본문 URL |

---

## 3. 해결 확인

Swagger · 백엔드 코드 기준. 실제 호출은 로그인 이후 확인 예정.

- 게시글 계열 503 → 토큰 없을 때 401로 정상 응답
- 주변 게시글 목록 `GET /posts/nearby` (정렬 · 카테고리 · 검색 `q` 포함)
- 응답 필드: 작성자 닉네임 · 익명, 반응 종류별 개수, 내 반응, 거리, 종료 시각, 답글 부모 ID, 현장 인증, 실명
- 신규 API: 게시글 수정 · 종료/재개, 신고, 차단, 알림 설정 · 게시판별 알림 · 모두 읽음 · 삭제, 최근 활동, 칭호, 행정동 랭킹
- 카테고리 코드 `EMERGENCY` · `HELP` · `NEWS` · `ETC` 확정
- 알림 목록 응답 스키마 추가
- WebSocket 인증: 로그인 · 갱신 응답에서 `wgo_access_token` HttpOnly 쿠키 발급 방식으로 결정
- 약관 code: `SERVICE`, `PRIVACY_COLLECTION_USE`, `LOCATION`
- iOS 앱 카카오 로그인 복귀: 웹 연동 이후 진행으로 정리됨
