# 백엔드 연동 기록

- Swagger: https://d35lxgeutzw8c6.cloudfront.net/docs
- 기준: 2026-10-28 staging 호출 결과
- API 경로 · 필드 이름은 예시
- 노션 "WGO 백엔드 연동 기록"과 같은 내용

---

## 1. 연동 진행에 필요한 것

| # | 항목 | 현재 상태 |
| --- | --- | --- |
| 1-1 | 게시글 계열 API 503 해제 | `/posts/*`, `/location`, `/notifications/*`, `/posts/media/*` 모두 `503 Authentication integration unavailable` |
| 1-2 | 주변 게시글 목록 공개 API | `/internal/v1/posts/nearby` 내부용만 있음 |
| 1-3 | 카카오 REST API 키, redirect URI 등록 | 로그인 코드 연결 완료, 실제 로그인 확인 전 |

- 1-1: 글 작성 · 상세 · 댓글 · 공감 · 투표 · 위치 · 알림 · 사진 업로드 모두 해당. 프론트 호출 코드는 준비됨 (`src/api/posts.ts`)
- 1-2: 지도 핀, 게시판 목록에 사용
  - 예시: `GET /api/v1/posts/nearby?latitude=&longitude=&radiusM=&cursor=&limit=`
  - 응답: 게시글 상세 필드 + `distanceM`
  - 거리순 · 최신순 정렬, 카테고리 필터 사용
- 1-3: redirect URI `http://localhost:5173/auth/kakao/callback` (백엔드 `KAKAO_REDIRECT_URI`, Kakao Developers 등록 주소 동일)

---

## 2. 응답 필드 추가

| # | API | 필드 | 화면 |
| --- | --- | --- | --- |
| 2-1 | 게시글 상세 · 목록 | `authorNickname`, `anonymous` | 게시글 작성자 이름 |
| 2-2 | 게시글 상세 · 목록 | `reactionCounts: { CURIOUS, STILL_HAPPENING, HELPFUL, ENDED }` | 게시글 반응 4종 개수 |
| 2-3 | 게시글 상세 · 목록 | `myReaction` | 내 반응 표시 |
| 2-4 | 댓글 목록 | `authorNickname` | 댓글 작성자 이름 |
| 2-5 | 댓글 목록 | `myReaction` | 내 댓글 공감 표시 |
| 2-6 | 댓글 작성 · 목록 | `parentCommentId` | 답글 |
| 2-7 | 게시글 작성 요청 | `anonymous` | 닉네임 / 익명 선택 |

- 2-1, 2-4: 현재 작성자는 `authorId`만 있음
- 2-2: 현재 `counters.reactionCount` 합계만 있음
- 2-3, 2-5: 반응 취소 · 변경 판단에 필요
- 2-6: 답글 지원 여부 확정 필요

---

## 3. 신규 API

| # | 기능 | 화면 | 우선순위 |
| --- | --- | --- | --- |
| 3-1 | 게시판 종료 · 종료 해제 | 게시글 ⋯ → 종료, 최근 활동 → 종료 해제 | 높음 |
| 3-2 | 신고 (게시글 · 댓글, 사유) | 게시글 · 댓글 ⋯ → 신고 | 높음 |
| 3-3 | 차단 · 차단 목록 | 게시글 · 댓글 ⋯ → 차단 | 높음 |
| 3-4 | 게시글 수정 | 게시글 ⋯ → 수정 | 보통 |
| 3-5 | 게시글 검색 | 게시판 → 검색 | 보통 |
| 3-6 | 게시판별 알림 on/off | 게시판 · 피드 종 아이콘 | 보통 |
| 3-7 | 알림 종류별 수신 설정 | 마이 → 알림 설정 | 보통 |
| 3-8 | 최근 활동 목록 | 마이 → 최근 활동 | 낮음 |
| 3-9 | 칭호 · 활동 점수 | 활동 탭 → 뱃지 | 낮음 |
| 3-10 | 지역 랭킹 | 활동 탭 → 랭킹 | 낮음 |

- 3-1: 현재 `expiresAt` 자동 만료만 있음
- 3-9: 칭호 4단계(소식통 → 리포터 → 특파원 → 천리안). 참여 횟수, 받은 '맞아요' 수, 대표 의견 점수, 현재 칭호 필요
- 3-10: 천리안 사용자의 지역(동)별 순위, 내 순위

---

## 4. 확정 필요한 값 · 설정

| # | 항목 | 현재 상태 |
| --- | --- | --- |
| 4-1 | 카테고리 코드 | 서버 예시 `INCIDENT`, `CROWD` |
| 4-2 | 약관 데이터 | `GET /terms` → `{"terms":[]}` |
| 4-3 | 알림 목록 응답 형식 | Swagger `GET /notifications` 응답 스키마 없음 |
| 4-4 | WebSocket 브라우저 인증 | 브라우저 WebSocket은 Authorization 헤더 불가 |
| 4-5 | iOS 앱 카카오 로그인 복귀 | 앱에서는 localhost redirect 불가 |

- 4-1: 화면 카테고리 4개(긴급 사고 · 도움 요청 · 동네 소식 · 일상 불편)의 코드값. 프론트 임시값 `EMERGENCY` · `HELP` · `NEWS` · `ETC`
- 4-2: 동의 API는 약관 ID 1개 이상 필요. 필수 약관 3개(서비스 이용 · 개인정보 처리 · 위치정보 이용) 등록, 약관 `code` 이름 필요
- 4-4: 쿠키 방식 또는 접속 티켓 방식
- 4-5: 앱용 redirect(딥링크) 방식. 웹 연동 이후
