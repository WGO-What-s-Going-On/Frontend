# 백엔드 연동 기록

프론트 ↔ staging 백엔드 연동 현황과, 연동하다 막힌 것 · 에러를 모아 두는 문서.
백엔드에 전달할 때는 아래 **이슈 · 에러 기록**의 "백엔드에 바라는 것"만 보면 된다.

- Swagger: https://d35lxgeutzw8c6.cloudfront.net/docs
- 실행: `cp .env.example .env.local` → `npm run dev -- --port 5173 --strictPort` (CORS가 `http://localhost:5173`만 허용)
- `.env.local`에 주소가 없으면 지금처럼 목업으로 동작
- 에러가 나면 브라우저 콘솔에 `[API] 메서드 경로 → 상태 코드: 메시지 (requestId)`가 찍힘 → 그대로 아래 표에 옮기기 (토큰은 남기지 않기)

## 기능별 현황

| 기능 | API | 상태 |
| --- | --- | --- |
| 카카오 로그인 · 토큰 갱신 · 로그아웃 | `/auth/kakao`, `/auth/refresh`, `/auth/logout` | 코드 연결 완료. 카카오 앱 키 · redirect URI 받으면 실제 로그인 가능 |
| 약관 동의 | `GET /terms`, `POST /users/me/term-consents` | 연결 완료. 서버 약관 목록이 비어 있어 동의 요청은 건너뜀 (#3) |
| 닉네임 중복 확인 · 저장 | `GET /users/nickname/availability`, `PATCH /users/me` | 연결 완료, 중복 확인은 실제 서버로 동작 확인 |
| 내 정보 | `GET /users/me` | 연결 완료 (로그인 후 확인 필요) |
| 지도 핀 · 게시판 목록 | 없음 | **API 없음** (#1) |
| 글 작성 · 비슷한 글 · 상세 · 댓글 · 공감 · 투표 · 위치 | `/posts/*`, `/location` | 함수 준비 완료 (`src/api/posts.ts`), 서버 503이라 화면은 목업 (#2) |
| 알림 | `/notifications/*` | 503, 응답 형식 Swagger에 없음 (#10) |
| 사진 업로드 | `/posts/media/uploads/*` | 503 |
| 실시간 (WebSocket) | `wss://…/ws/v1` | 브라우저 인증 방식 미정 (#13) |

## 이슈 · 에러 기록

| # | 날짜 | 구분 | 내용 | 확인 결과 | 백엔드에 바라는 것 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 10-28 | API 없음 | 주변 게시글 목록 (지도 핀 · 게시판 첫 화면) | 주변 검색은 `/internal/v1/posts/nearby`로 내부용만 있음 | 위치 · 반경으로 주변 글 목록을 주는 공개 API | 열림 |
| 2 | 10-28 | 503 | 게시글 · 댓글 · 공감 · 투표 · 위치 · 알림 · 업로드 | `POST /posts/similar` → `503 Authentication integration unavailable` | 공개 사용자 인증 연결 (문서에 적힌 작업) | 열림 |
| 3 | 10-28 | 데이터 | 약관 목록이 비어 있음 | `GET /terms` → `{"terms":[]}`, 동의 API는 ID 최소 1개 | staging에 필수 약관 3개 등록 (서비스 · 개인정보 · 위치정보), 약관 code 이름 공유 | 열림 |
| 4 | 10-28 | 응답 필드 | 게시글 · 댓글에 작성자 닉네임 없음 (authorId만), 익명 여부 없음 | Swagger 응답 확인 | 작성자 닉네임(또는 익명 표시) 필드 | 열림 |
| 5 | 10-28 | 응답 필드 | 게시글 반응별 개수 · 내가 누른 공감 없음 (게시글 · 댓글) | `counters.reactionCount` 합계만 있음 | 반응 종류별 개수, 내 공감 종류 | 열림 |
| 6 | 10-28 | 기능 | 답글(대댓글) | 댓글에 parentId 없음 | 답글 지원 여부 결정 | 열림 |
| 7 | 10-28 | 합의 | 카테고리 코드 | 서버 예시는 `INCIDENT`, `CROWD`. 우리는 긴급 사고 · 도움 요청 · 동네 소식 · 일상 불편 (프론트 임시 코드 `EMERGENCY` · `HELP` · `NEWS` · `ETC`) | 4개 카테고리 코드값 확정 | 열림 |
| 8 | 10-28 | 합의 | 카카오 로그인 설정 | 프론트 콜백 주소 `http://localhost:5173/auth/kakao/callback` | 카카오 REST API 키, 백엔드 `KAKAO_REDIRECT_URI` · Kakao Developers 등록 주소를 위 주소로 | 열림 |
| 9 | 10-28 | API 없음 | 게시글 수정 · 게시판 종료 · 신고 · 차단 · 검색 · 칭호 단계 · 랭킹 · 최근 활동 | 공개 API에 없음 (종료는 서버 `expiresAt` 자동 만료만) | 기능별 계획 공유 | 열림 |
| 10 | 10-28 | 문서 | 알림 목록 응답 형식이 Swagger에 없음 | `GET /notifications` 200 응답 스키마 비어 있음 | 응답 형식 공유 | 열림 |
| 11 | 10-28 | 규칙 | 닉네임 규칙이 다름 | 중복 확인은 1글자도 사용 가능, `PATCH`는 최대 30자. 프론트는 2~12자 · 한글/영문/숫자 | 서버 규칙 확정 (프론트를 맞출지 결정) | 열림 |
| 12 | 10-28 | 규칙 | 비슷한 글 범위 | 서버는 150m · 최근 24시간 고정, 우리 공개 범위는 최대 350m | 범위가 넓은 글도 비교할지 결정 | 열림 |
| 13 | 10-28 | 인증 | WebSocket 브라우저 인증 | 브라우저 `WebSocket`은 Authorization 헤더를 못 붙임 (백엔드 문서 4절) | 쿠키 또는 접속 티켓 방식 | 열림 |
| 14 | 10-28 | 합의 | iOS 앱(Capacitor)의 카카오 로그인 복귀 | 앱 안에서는 localhost 주소로 돌아올 수 없음 | 앱용 redirect(딥링크) 방식 — 웹 연동 끝난 뒤 | 나중 |

## 프론트에서 맞춘 것 · 맞출 것

- 글 제목 필수 → 작성 화면에는 제목 칸이 없어서 본문 첫 문장을 제목으로 만들어 보냄
- 공개 범위 → `radiusM` 150 · 250 · 350 그대로 보냄
- 공감 종류 → `CURIOUS` · `STILL_HAPPENING` · `HELPFUL` · `ENDED` / 댓글 `HELPFUL` · `AGREE` · `DIFFERENT`로 변환 (`src/api/posts.ts`)
- 게시글 · 댓글 공감은 하나만 (이미 맞춤), 취소는 종류를 지정해 `DELETE`
- 사용자 · 작성자 ID: 서버는 숫자/문자열 → 화면에서는 문자열로 통일
- 시간: 서버 ISO 시간 → "N분 전"으로 바꾸는 처리 필요
- 위치: 목업 지도 좌표(m) → 실제 위경도 (GPS · 지도 SDK 연결 때)
