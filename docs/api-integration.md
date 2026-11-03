# 백엔드 연동 기록

- 기준: 2026-11-03 GCP 서버 호출 결과(테스트 계정 토큰), Swagger 61개 API 대조, 백엔드 `docs/contracts/frontend-integration.md`
- HTTP: https://api.136-81-245-176.sslip.io (Swagger `/docs`)
- WebSocket: wss://ws.136-81-245-176.sslip.io/ws/v1
- 노션 "연동 관련"과 같은 내용

---

<details>
<summary>해결 완료</summary>

- 테스트 계정 토큰 발급(30일) → 토큰 필요 API 실제 호출 확인
- 실제 호출 확인: 닉네임 중복 확인 · 저장, 프로필 수정, 주변 게시글 · 지도 위치 재조회, 글 작성 · 상세 · 반응 · 수정 · 종료 · 삭제, 댓글 · 답글 · 댓글 공감 · 수정 · 삭제, 150m 밖 읽기 전용, 알림 목록 · 안 읽은 수 · 설정 저장 · 게시판별 알림, 최근 활동, 칭호, 뱃지 조회, 차단 목록, 행정동 조회, 투표(열림 · 고르기 · 옮기기 · 취소 · 종료 결과)
- WebSocket: 테스트 토큰(Node, `Authorization` 헤더)으로 연결 · `board.join` · `comment.created` · `comment.deleted` · `post.updated` 수신, 강제 끊김 후 재연결 · 재참여 확인
- WebSocket · HTTP CORS: `http://localhost:5173` 허용, credentials 허용
- 사진 업로드: 발급 → GCS PUT → `complete` → 글 · 댓글 첨부 · 조회 확인 (브라우저 업로드는 1-2 대기)
- 카카오 지도: JavaScript 키 · `http://localhost:5173` 도메인 등록 → 실제 지도 표시 확인
- 약관 문서 URL: `https://wgo-what-s-going-on.github.io/Frontend/terms/{service,privacy,location}.html`
- 댓글 수정 API(`PATCH /posts/{postId}/comments/{commentId}`) 추가 → 프론트 연결
- 오류 해결: `GET /terms` 404 → 200, `GET /notifications` 404 → 200, 게시글 계열 503 → 200, `GET /posts/me/region` 500 → 200
- 프론트 반영: 신고 요청 형식(`targetType` · `postId` · `commentId` · `reason` enum · `description`), 게시판별 알림 기본값(켜짐), 투표 `mySelection` 문자열, 알림 `targetId`(게시글 ID), 댓글 작성 전 게시판 참여(`POST /posts/{postId}/participants`), 글 생성 응답 필드 부족 → 생성 후 상세 재조회
- 코드 확정: 카테고리 `EMERGENCY` · `HELP` · `NEWS` · `ETC`, 약관 `SERVICE` · `PRIVACY_COLLECTION_USE` · `LOCATION`
- WebSocket 인증: 로그인 · 갱신 응답에서 `wgo_access_token` HttpOnly 쿠키 발급 방식으로 결정
- iOS 앱 카카오 로그인 복귀: 웹 연동 이후 진행으로 정리됨
- 카카오 로그인(웹, localhost): REST API 키 수령, 콘솔 Redirect URI 등록, 서버 `KAKAO_REDIRECT_URI` 경로 누락 수정(user-service secret v6, 11-03 21:41 배포) → 인가 · code 수신 · 토큰 교환 · 로그인 확인

</details>

## 1. 처리 필요

| # | 항목 | 확인 결과 (11-03 21:41) | 담당 |
| --- | --- | --- | --- |
| 1-1 | iOS 앱 origin 허용 | `capacitor://localhost`: HTTP API CORS 허용 헤더 없음, WebSocket 403 `WS_ORIGIN_FORBIDDEN` | 도현 |
| 1-2 | 사진 업로드 CORS | GCS 업로드 주소에 `Access-Control-Allow-Origin` 없음 → 브라우저 PUT 차단 | 도현 |
| 1-3 | 행정동 랭킹 미설정 | `GET /posts/me/ranking` 503 `Region ranking is not configured` | 도현 |
| 1-4 | 약관 데이터 없음 | `GET /api/v1/terms` 200 `{"terms":[]}` | 도현 |
| 1-5 | 비슷한 글 검사 실패 | `POST /posts/similar` 503 `SIMILARITY_CHECK_UNAVAILABLE` | 백엔드 |
| 1-6 | 신고 접수 불가 | `POST /moderation/reports` 503 `Authenticated Moderation-to-Post target verification is not supported` | 백엔드 |
| 1-7 | 뱃지 지급 로직 없음 | `GET /users/me/badges` 조회만 있음, 지급 처리 없음 | 백엔드 |
| 1-8 | Swagger 응답 스키마 누락 | `/posts/me/region`, `/notifications/settings`, `/notifications/boards/{postId}`, `/notifications/read-all` | 백엔드 |
| 1-9 | 푸시 알림 | `PUT /notifications/push-subscriptions`(FCM) 연결에 Firebase 프로젝트 · iOS 설정 파일 필요 | 백엔드 |
| 1-10 | 프로필 사진 업로드 미배포 | 백엔드 dev 병합(#96), Swagger에 API 없음 | 도현 |

- 1-1 · 1-2: 코드 배포(11-02 CD main)는 완료. 변경은 `environment.example.json` · `.env.example`에만 있음. 실제 GKE 환경 설정 `webOrigins`(HTTP CORS · GCS 버킷 CORS)와 `websocketOrigins`에 `http://localhost:5173`, `capacitor://localhost` 추가 후 재배포 필요. GCS는 `PUT` method, `Content-Type` · `x-goog-if-generation-match` header 허용 포함
- 1-3: `POST_REGION_ENABLED`, Map `KAKAO_LOCAL_REST_API_KEY` 등 랭킹 설정 필요. 행정동 조회는 정상
- 1-3 관련(dev 반영, 미배포): `POST_REGION_ENABLED` 제거, 신규 글 작성 시 행정동 조회 필수. Map `KAKAO_LOCAL_REST_API_KEY` 없으면 글 작성 503
- 1-4: 위 약관 문서 URL로 `seed:terms` 실행 필요. 현재 프론트는 약관 목록이 비면 동의 저장 없이 진행
- 1-5: 현재 프론트는 검사 실패 시 비슷한 글 팝업 없이 바로 게시
- 1-6: 프론트 요청 형식은 계약과 일치. 현재는 "지금은 신고를 받을 수 없어요" 안내
- 1-7: 프론트 뱃지 4종(첫 소식 · 해결사 · 탐정 · 단골 이웃)과 서버 뱃지 `name` 일치 필요. 현재 프론트는 서버가 준 뱃지만 획득으로 표시
- 1-8: 응답 형식은 실제 응답 · 백엔드 코드로 확인해 프론트에 반영함
- 1-9: 프론트는 Capacitor 푸시 플러그인 · APNs 설정 후 토큰 등록 연결 예정
- 1-10: 배포 후 프론트 연결. `PATCH /users/me`의 `profileImageKey`는 제거용 `null`만 허용으로 변경됨

---

## 2. 로그인 후 확인할 것

| # | 항목 | 내용 | 담당 |
| --- | --- | --- | --- |
| 2-1 | WebSocket 쿠키 인증 | HTTP(`api.`)와 WebSocket(`ws.`) 호스트가 달라 `wgo_access_token` 쿠키의 `Domain` 설정(`AUTH_COOKIE_DOMAIN`) 필요. localhost ↔ sslip.io는 다른 사이트라 타사 쿠키 차단 가능 | 도현 |
| 2-2 | 로그인 이후 흐름 | 첫 로그인 온보딩(약관 · 닉네임 · 위치 권한), 재로그인, 토큰 갱신, 로그아웃 · 쿠키 삭제 확인 | 프론트 |
