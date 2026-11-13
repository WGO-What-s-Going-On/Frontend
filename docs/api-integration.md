# 백엔드 연동 기록

- 기준: 2026-11-13 GCP 서버 호출 결과(테스트 계정 토큰), 백엔드 main(`df4c105`) 코드 · `docs/contracts/frontend-integration.md`
- HTTP: https://api.136-81-245-176.sslip.io (Swagger `/docs`)
- WebSocket: wss://ws.136-81-245-176.sslip.io/ws/v1
- 프론트 배포: https://wgo-now.vercel.app (Vercel)
- 노션 "연동 관련"과 같은 내용

---

<details>
<summary>해결 완료</summary>

- 테스트 계정 토큰 발급(30일) → 토큰 필요 API 실제 호출 확인
- 실제 호출 확인: 닉네임 중복 확인 · 저장, 프로필 수정, 주변 게시글 · 지도 위치 재조회, 글 작성 · 상세 · 반응 · 수정 · 종료 · 삭제, 댓글 · 답글 · 댓글 공감 · 수정 · 삭제, 150m 밖 읽기 전용, 알림 목록 · 안 읽은 수 · 설정 저장 · 게시판별 알림, 최근 활동, 칭호, 뱃지 조회, 차단 목록, 행정동 조회, 투표(열림 · 고르기 · 옮기기 · 취소 · 종료 결과)
- WebSocket: 테스트 토큰(Node, `Authorization` 헤더)으로 연결 · `board.join` · `comment.created` · `comment.deleted` · `post.updated` 수신, 강제 끊김 후 재연결 · 재참여 확인
- WebSocket · HTTP CORS: `http://localhost:5173` 허용, credentials 허용
- 사진 업로드: 발급 → GCS PUT → `complete` → 글 · 댓글 첨부 · 조회 확인
- GCS 버킷 CORS: `http://localhost:5173` · `https://wgo-now.vercel.app` 허용 확인 (11-03 22:23 배포)
- 배포 주소 허용: `https://wgo-now.vercel.app` HTTP CORS · WebSocket(101) · GCS CORS 허용, 카카오 지도 도메인 등록 확인
- 카카오 지도: JavaScript 키 · `http://localhost:5173` 도메인 등록 → 실제 지도 표시 확인
- 약관 문서 URL: `https://wgo-what-s-going-on.github.io/Frontend/terms/{service,privacy,location}.html`
- 댓글 수정 API(`PATCH /posts/{postId}/comments/{commentId}`) 추가 → 프론트 연결
- 오류 해결: `GET /terms` 404 → 200, `GET /notifications` 404 → 200, 게시글 계열 503 → 200, `GET /posts/me/region` 500 → 200
- 프론트 반영: 신고 요청 형식(`targetType` · `postId` · `commentId` · `reason` enum · `description`), 게시판별 알림 기본값(켜짐), 투표 `mySelection` 문자열, 알림 `targetId`(게시글 ID), 댓글 작성 전 게시판 참여(`POST /posts/{postId}/participants`), 글 생성 응답 필드 부족 → 생성 후 상세 재조회
- 코드 확정: 카테고리 `EMERGENCY` · `HELP` · `NEWS` · `ETC`, 약관 `SERVICE` · `PRIVACY_COLLECTION_USE` · `LOCATION`
- WebSocket 인증: 로그인 · 갱신 응답에서 `wgo_access_token` HttpOnly 쿠키 발급 방식으로 결정
- iOS 앱 카카오 로그인 복귀: 웹 연동 이후 진행으로 정리됨
- 카카오 로그인(웹, localhost): REST API 키 수령, 콘솔 Redirect URI 등록, 서버 `KAKAO_REDIRECT_URI` 경로 누락 수정(user-service secret v6, 11-03 21:41 배포) → 인가 · code 수신 · 토큰 교환 · 로그인 확인
- 로그인 이후 흐름(localhost): 첫 로그인 온보딩(약관 · 닉네임 · 위치 권한), 재로그인, 실제 로그인 쿠키로 WebSocket 연결(콘솔 경고 없음) 확인
- 랭킹(행정동) · 뱃지 지급: 서버 반영 확인 (11-06 · 11-07)
- 사진 보일 위치 `coverFocus`(#127): 글 작성 body `{x,y}` 0~100 정수 · 사진 있을 때만, 상세 · 주변 목록 · 최근 활동 응답 포함 → 프론트 전송 상시 적용 (`VITE_SERVER_COVER_FOCUS` 제거)
- 사진 조회 서명 URL 재사용 · 브라우저 캐시(#127) 반영. 프론트도 mediaId별 유효 URL 재사용 유지
- WebSocket 일회용 티켓(#127): `POST /realtime/tickets` → `?ticket=` 접속 → 프론트 적용, 재연결마다 새 티켓. 티켓 발급 실패 시 쿠키 접속
- 카카오 Redirect 허용 목록(#127): `POST /auth/kakao` 바디 `redirectUri` → 프론트 전송 적용. 배포 허용 목록에 `https://wgo-now.vercel.app` 포함 확인
- 이동 중 글쓰기 제한(#123): 글 작성 · 비슷한 글 확인 403 `USER_MOVING` · `MOVEMENT_UNCONFIRMED` → 안내 창(12초 정지 확인 후 다시 올리기), 글쓰기 시트 7초 · 안내 창 5초 주기 위치 전송, 위치 전송 5초 이상 간격

</details>

## 1. 처리 필요

| # | 항목 | 확인 결과 (11-13) | 담당 |
| --- | --- | --- | --- |
| 1-1 | 앱 origin 허용 | `capacitor://localhost`(iOS) · `https://localhost`(안드로이드) HTTP CORS 허용 헤더 없음 | 도현 |
| 1-2 | 카카오 Redirect 허용 목록에 localhost 없음 | `http://localhost:5173/auth/kakao/callback` → 400 `redirectUri must match an allowed Kakao redirect URI` | 도현 |
| 1-3 | 약관 데이터 없음 | `GET /api/v1/terms` 200 `{"terms":[]}` | 도현 |
| 1-4 | 비슷한 글 검사 간헐 실패 | `POST /posts/similar` 4회 중 2회 503 `SIMILARITY_CHECK_UNAVAILABLE` | 백엔드 |
| 1-5 | 신고 접수 불가 | `POST /moderation/reports` 503 `Authenticated Post report-target contract is not configured` | 백엔드 |
| 1-6 | 프로필 사진 업로드 | 503 `Profile image signing unavailable`. 공유 버킷 수정(#138)은 dev에만 있고 main 미반영 | 대준 |
| 1-7 | 이동 판정 GPS 오차 | 위치 정확도 없이 연속 좌표로 속도 계산. 실내 GPS 튐(5초에 28m 이상)으로 정지 상태에서도 `USER_MOVING` 가능 | 도현 |

- 1-1: GKE 설정 `webOrigins`(HTTP CORS · GCS 버킷 CORS) · `websocketOrigins`에 추가 후 재배포 필요
- 1-2: 로컬 개발 로그인용. 배포 주소 로그인은 정상
- 1-3: 위 약관 문서 URL로 `seed:terms` 실행 필요. 현재 프론트는 약관 목록이 비면 동의 저장 없이 진행
- 1-4: 현재 프론트는 검사 실패 시 비슷한 글 팝업 없이 바로 게시
- 1-5: 프론트 요청 형식은 계약과 일치. 현재는 "지금은 신고를 받을 수 없어요" 안내
- 1-7: 프론트는 직전 전송 위치에서 오차 범위(최대 25m) 안 이동은 같은 자리로 전송해 완화. 서버에서 위치 정확도(`accuracy`) 반영 또는 임계 조정 검토 필요
- 미사용: 글 작성 `displayPosition`(#124, 화면 배치 좌표)은 선택 필드라 현재 보내지 않음. 알림 설정 `rewards` · `votes` · `moderation`은 화면 항목 추가 시 연결
