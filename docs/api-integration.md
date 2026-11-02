# 백엔드 연동 기록

- 기준: 2026-11-02 GCP 서버 호출 결과(테스트 계정 토큰), Swagger 61개 API 대조, 백엔드 `docs/contracts/frontend-integration.md`
- HTTP: https://api.136-81-245-176.sslip.io (Swagger `/docs`)
- WebSocket: wss://ws.136-81-245-176.sslip.io/ws/v1
- 노션 "연동 관련"과 같은 내용

---

<details>
<summary>해결 완료</summary>

- 테스트 계정 토큰 발급(30일) → 토큰 필요 API 실제 호출 확인
- 실제 호출 확인: 닉네임 중복 확인 · 저장, 프로필 수정, 주변 게시글 · 지도 위치 재조회, 글 작성 · 상세 · 반응 · 수정 · 종료 · 삭제, 댓글 · 답글 · 댓글 공감 · 수정 · 삭제, 150m 밖 읽기 전용, 알림 목록 · 안 읽은 수 · 설정 저장 · 게시판별 알림, 최근 활동, 칭호, 뱃지, 차단 목록, 행정동 조회, 투표(열림 · 고르기 · 옮기기 · 취소 · 종료 결과)
- 댓글 수정 API(`PATCH /posts/{postId}/comments/{commentId}`) 연결
- 신고 요청 형식: `targetType` · `postId` · `commentId` · `reason`(enum) · `description`으로 맞춤
- 게시판별 알림: 서버 기본값(켜짐) 기준으로 표시
- WebSocket: 테스트 토큰(Node, `Authorization` 헤더)으로 연결 · `board.join` · `comment.created` · `comment.deleted` · `post.updated` 수신, 강제 끊김 후 재연결 · 재참여 확인
- WebSocket origin: `http://localhost:5173` 허용
- 사진 업로드: 발급 → GCS PUT → `complete` → 글 · 댓글 첨부 · 조회 확인 (브라우저는 1-6 대기)
- 카카오 지도: JavaScript 키 · `http://localhost:5173` 도메인 등록 → 실제 지도 표시 확인
- 약관 문서 URL: `https://wgo-what-s-going-on.github.io/Frontend/terms/{service,privacy,location}.html`
- 행정동 조회 `GET /posts/me/region` 500 → 200
- `GET /terms` 404 → 200, `GET /notifications` 404 → 200, 게시글 계열 503 → 200
- CORS: localhost origin 허용, credentials 허용
- 댓글 작성은 게시판 참여(`POST /posts/{postId}/participants`) 이후 가능 → 프론트 반영
- 글 생성 응답에 `authorNickname` · `reactionCounts` · `media` 없음 → 생성 후 상세 재조회로 프론트 반영
- 알림 `targetId`는 댓글 알림도 게시글 ID → 프론트 반영
- 카테고리 코드 `EMERGENCY` · `HELP` · `NEWS` · `ETC`, 약관 code `SERVICE` · `PRIVACY_COLLECTION_USE` · `LOCATION`
- WebSocket 인증: 로그인 · 갱신 응답에서 `wgo_access_token` HttpOnly 쿠키 발급 방식으로 결정
- iOS 앱 카카오 로그인 복귀: 웹 연동 이후 진행으로 정리됨

</details>

## 1. 처리 필요

| # | 항목 | 확인 결과 | 담당 |
| --- | --- | --- | --- |
| 1-1 | iOS 앱 origin 차단 | `capacitor://localhost`: HTTP API CORS 허용 헤더 없음, WebSocket 403 `WS_ORIGIN_FORBIDDEN` | 도현 |
| 1-2 | 카카오 redirect URI | `https://api.136-81-245-176.sslip.io/auth/kakao/callback`은 백엔드 주소라 404 | 대준(설정) · 도현(재배포) |
| 1-3 | 카카오 REST API 키 | 프론트 인가 URL의 `client_id`에 필요 | 대준 |
| 1-4 | 비슷한 글 검사 실패 | `POST /posts/similar` 503 `SIMILARITY_CHECK_UNAVAILABLE` | 백엔드 |
| 1-5 | 행정동 랭킹 미설정 | `GET /posts/me/ranking` 503 `Region ranking is not configured` | 도현 |
| 1-6 | 사진 업로드 CORS | GCS 업로드 주소에 `Access-Control-Allow-Origin` 없음 → 브라우저 PUT 차단 | 도현 |
| 1-7 | 약관 데이터 없음 | `GET /api/v1/terms` 200 `{"terms":[]}` | 도현 |
| 1-8 | 신고 접수 불가 | `POST /moderation/reports` 503 `Authenticated Moderation-to-Post target verification is not supported` | 백엔드 |
| 1-9 | 뱃지 지급 로직 없음 | `GET /users/me/badges` 조회만 있음, 지급 처리 없음 | 백엔드 |
| 1-10 | Swagger 응답 스키마 누락 | `/posts/me/region`, `/notifications/settings`, `/notifications/boards/{postId}`, `/notifications/read-all` | 백엔드 |
| 1-11 | 푸시 알림 | `PUT /notifications/push-subscriptions`(FCM) 연결에 Firebase 프로젝트 · iOS 설정 파일 필요 | 백엔드 |

- 1-1: HTTP gateway CORS와 ws-gateway `WS_ALLOWED_ORIGINS`에 `capacitor://localhost` 추가 필요. 2-1 쿠키 Domain 설정과 함께 재배포
- 1-2: 카카오 → 프론트 `/auth/kakao/callback`(code 수신) → `POST /api/v1/auth/kakao` 구조라 redirect URI는 프론트 주소여야 함. 개발용 `http://localhost:5173/auth/kakao/callback`을 카카오 콘솔 · 깃헙 환경변수 `KAKAO_REDIRECT_URI`에 동일하게 설정(대준) 후 재배포(도현) 필요
- 1-3: 백엔드 `KAKAO_REST_API_KEY`와 같은 키. 프론트는 인가 요청에 `state`를 붙여 돌아온 값과 비교함
- 1-4: 현재 프론트는 검사 실패 시 비슷한 글 팝업 없이 바로 게시
- 1-5: 활동 > 랭킹 탭 조회 불가. 행정동 조회는 정상
- 1-6: 미디어 버킷 CORS에 `http://localhost:5173`, `capacitor://localhost` origin, `PUT` method, `Content-Type` · `x-goog-if-generation-match` header 허용 필요
- 1-7: 위 약관 문서 URL로 `seed:terms` 실행 필요
- 1-8: 프론트 요청 형식은 계약과 일치. 현재는 "지금은 신고를 받을 수 없어요" 안내
- 1-9: 프론트 뱃지 4종(첫 소식 · 해결사 · 탐정 · 단골 이웃)과 서버 뱃지 `name` 일치 필요. 현재 프론트는 서버가 준 뱃지만 획득으로 표시
- 1-10: 응답 형식은 백엔드 코드로 확인해 프론트에 반영함
- 1-11: 프론트는 Capacitor 푸시 플러그인 · APNs 설정 후 토큰 등록 연결 예정

---

## 2. 로그인 후 확인할 것

| # | 항목 | 내용 | 담당 |
| --- | --- | --- | --- |
| 2-1 | WebSocket 쿠키 인증 | HTTP(`api.`)와 WebSocket(`ws.`) 호스트가 달라 `wgo_access_token` 쿠키의 `Domain` 설정(`AUTH_COOKIE_DOMAIN`) 필요. localhost ↔ sslip.io는 다른 사이트라 타사 쿠키 차단 가능 | 도현 |
