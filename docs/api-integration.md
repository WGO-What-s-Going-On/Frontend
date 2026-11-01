# 백엔드 연동 기록

- 기준: 2026-11-02 GCP 서버 호출 결과(테스트 계정 토큰), 백엔드 `docs/contracts/frontend-integration.md`
- HTTP: https://api.136-81-245-176.sslip.io (Swagger `/docs`)
- WebSocket: wss://ws.136-81-245-176.sslip.io/ws/v1
- 노션 "연동 관련"과 같은 내용

---

<details>
<summary>해결 완료</summary>

- 테스트 계정 토큰 발급(30일) → 토큰 필요 API 실제 호출 확인
- 실제 호출 확인: 닉네임 중복 확인 · 저장, 프로필 수정, 주변 게시글, 글 작성 · 상세 · 반응 · 수정 · 종료 · 삭제, 댓글 · 답글 · 댓글 공감 · 삭제, 150m 밖 읽기 전용, 알림 목록 · 설정 저장 · 게시판별 알림, 칭호, 뱃지
- WebSocket: 테스트 토큰(Node, `Authorization` 헤더)으로 연결 · `board.join` · `comment.created` · `comment.deleted` · `post.updated` 수신, 강제 끊김 후 재연결 · 재참여 확인
- 사진 업로드: 발급 → GCS PUT → `complete` → 글 · 댓글 첨부 · 조회 확인 (브라우저는 1-9 대기)
- WebSocket origin: `http://localhost:5173` 허용
- `GET /terms` 404 → 200
- `GET /notifications` 404 → 200
- 게시글 계열 503 → 200
- CORS: localhost origin 허용, credentials 허용
- 댓글 작성은 게시판 참여(`POST /posts/{postId}/participants`) 이후 가능 → 프론트 반영
- 글 생성 응답에 `authorNickname` · `reactionCounts` · `media` 없음 → 생성 후 상세 재조회로 프론트 반영
- 주변 게시글 목록 `GET /posts/nearby` (정렬 · 카테고리 · 검색 `q` 포함)
- 응답 필드: 작성자 닉네임 · 익명, 반응 종류별 개수, 내 반응, 거리, 종료 시각, 답글 부모 ID, 현장 인증, 실명
- 신규 API: 게시글 수정 · 종료/재개, 신고, 차단, 알림 설정 · 게시판별 알림 · 모두 읽음 · 삭제, 최근 활동, 칭호, 행정동 랭킹, 내 뱃지
- 카테고리 코드 `EMERGENCY` · `HELP` · `NEWS` · `ETC` 확정
- 알림 목록 응답 스키마 추가
- WebSocket 인증: 로그인 · 갱신 응답에서 `wgo_access_token` HttpOnly 쿠키 발급 방식으로 결정
- 약관 code: `SERVICE`, `PRIVACY_COLLECTION_USE`, `LOCATION`
- iOS 앱 카카오 로그인 복귀: 웹 연동 이후 진행으로 정리됨

</details>

## 1. 처리 필요

| # | 항목 | 확인 결과 | 담당 |
| --- | --- | --- | --- |
| 1-1 | WebSocket origin 차단 | `capacitor://localhost`(iOS 앱) 403 `WS_ORIGIN_FORBIDDEN` | 도현 |
| 1-2 | 카카오 redirect URI | 변경된 `https://api.136-81-245-176.sslip.io/auth/kakao/callback`은 백엔드 주소라 404 | 대준(설정) · 도현(재배포) |
| 1-3 | 카카오 REST API 키 | 프론트 인가 URL의 `client_id`에 필요 | 대준 |
| 1-4 | 비슷한 글 검사 실패 | `POST /posts/similar` 503 `SIMILARITY_CHECK_UNAVAILABLE` | 백엔드 |
| 1-5 | 행정동 조회 실패 | `GET /posts/me/region` 500 `Internal server error` | 도현 |
| 1-6 | 약관 데이터 없음 | `GET /api/v1/terms` 200 `{"terms":[]}` | 백엔드 |
| 1-7 | Swagger 응답 스키마 누락 | `/notifications/unread-count`, `/posts/me/level`, `/posts/me/ranking`, `/posts/me/activity` | 백엔드 |
| 1-8 | 댓글 수정 API 없음 | 댓글 ⋯ → 수정 화면 있음, `PATCH /posts/{postId}/comments/{commentId}` 없음 | 백엔드 |
| 1-9 | 사진 업로드 CORS | GCS 업로드 주소에 `Access-Control-Allow-Origin` 없음 → 브라우저 PUT 차단 | 도현 |
| 1-10 | 뱃지 지급 로직 없음 | `GET /users/me/badges` 조회만 있음, 지급 처리 없음 | 백엔드 |

- 1-1: ws-gateway `WS_ALLOWED_ORIGINS`에 `capacitor://localhost` 추가 필요. 2-1 쿠키 Domain 설정과 함께 재배포
- 1-2: 카카오 → 프론트 `/auth/kakao/callback`(code 수신) → `POST /api/v1/auth/kakao` 구조라 redirect URI는 프론트 주소여야 함. 개발용 `http://localhost:5173/auth/kakao/callback`을 카카오 콘솔 · 깃헙 환경변수 `KAKAO_REDIRECT_URI`에 동일하게 설정(대준) 후 재배포(도현) 필요
- 1-3: 백엔드 `KAKAO_REST_API_KEY`와 같은 키
- 1-4: 현재 프론트는 검사 실패 시 비슷한 글 팝업 없이 바로 게시
- 1-5: 활동 > 랭킹 탭 조회 불가. `POST_REGION_ENABLED`, Map `KAKAO_LOCAL_REST_API_KEY` 설정 확인 필요
- 1-6: `seed:terms` 미실행. 현재 프론트는 약관 목록이 비면 동의 저장 없이 진행
- 1-7: 응답 형식은 백엔드 코드로 확인해 프론트에 반영함
- 1-8: 현재 프론트는 서버 연동 중 댓글 수정을 막아 둠
- 1-9: 미디어 버킷 CORS에 `http://localhost:5173`, `capacitor://localhost` origin, `PUT` method, `Content-Type` · `x-goog-if-generation-match` header 허용 필요
- 1-10: 프론트 뱃지 4종(첫 소식 · 해결사 · 탐정 · 단골 이웃)과 서버 뱃지 `name` 일치 필요. 현재 프론트는 서버가 준 뱃지만 획득으로 표시

---

## 2. 로그인 후 확인할 것

| # | 항목 | 내용 | 담당 |
| --- | --- | --- | --- |
| 2-1 | WebSocket 쿠키 인증 | HTTP(`api.`)와 WebSocket(`ws.`) 호스트가 달라 `wgo_access_token` 쿠키의 `Domain` 설정(`AUTH_COOKIE_DOMAIN`) 필요. localhost ↔ sslip.io는 다른 사이트라 타사 쿠키 차단 가능 | 도현 |
