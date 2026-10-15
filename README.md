# WGO Frontend

What's Going On? 프론트엔드 (React + TypeScript + Vite)
지금은 백엔드 없이 **목업 데이터**로 동작합니다.

## 준비

Node.js **20.19 이상** (22 권장)

```bash
node -v
```

## 처음 한 번

```bash
git clone https://github.com/WGO-What-s-Going-On/Frontend.git
cd Frontend
npm install
```

## 실행

```bash
npm run dev
```

브라우저에서 **http://localhost:5173** 열기

## 최신 화면 받기

```bash
git checkout main
git pull origin main
npm install    # package.json이 바뀐 경우에만
npm run dev
```

> 항상 `main` 브랜치 기준으로 보면 됩니다.

## 브랜치 안내

**보면 되는 건 `main` 하나입니다.** 최신 화면이 전부 여기에 모여 있어요.

| 브랜치 | 상태 | 볼 필요 |
|---|---|---|
| `main` | 최신 화면 (모든 작업이 합쳐진 곳) | ✅ 이것만 보면 됨 |
| `experiment/claude-sort-menu`<br>`experiment/claude-readonly-label`<br>`fix/board-card-hierarchy`<br>`fix/mockup-navigation-state`<br>`prototype/flow-only`<br>`prototype/ux-exploration`<br>`design/blue-signal` | 작업용 브랜치. 내용이 이미 `main`에 모두 들어감 | ❌ |
| `design/coral-neighborhood`<br>`design/mint-community` | 예전 색상 시안 (코랄 · 민트). 채택 안 함 | ❌ |
| `experiment/claude-ux-prototype` | 초기 화면 구성 실험 | ❌ |
| `experiment/claude-spec-complete` | 기능명세서 항목을 한꺼번에 넣어 본 참고용. 필요한 것만 `main`에 옮김 | ❌ (참고용) |

> 새 작업은 `experiment/…`, `fix/…` 브랜치에서 하고 끝나면 `main`에 합칩니다. 브랜치가 늘어나도 `main`만 받으면 돼요.

## 화면 볼 때 팁

- **모바일 크기로 보기**: 크롬 개발자 도구(F12) → 기기 툴바(Mac `Cmd+Shift+M` / Windows `Ctrl+Shift+M`) → 폭 `402`
- **시작**: 첫 화면 `카카오로 계속하기` → 약관 → 닉네임 → 위치 권한 → 지도
- **데이터 초기화**: 글·댓글은 브라우저에 저장됩니다. 처음 상태로 돌리려면 개발자 도구 콘솔에서
  ```js
  localStorage.clear()
  ```
  입력 후 새로고침
- **다크 모드**: 마이 → 오른쪽 위 해/달 토글

## 주요 화면 주소

| 화면 | 주소 |
|---|---|
| 첫 화면 (로그인) | `/` |
| 지도 | `/map` |
| 게시판 | `/boards` |
| 게시글 상세 | `/boards/:id` |
| 검색 | `/search` |
| 알림 | `/alerts` |
| 마이 | `/my` |

## API 연동할 곳

| 파일 | 내용 |
|---|---|
| `src/data/mockData.ts` | 목업 데이터 (게시글 · 댓글 · 알림) → API 응답으로 교체 |
| `src/context/AppContext.tsx` | 데이터 읽기·쓰기 함수 모음 (글쓰기, 댓글, 반응 등) → API 호출로 교체 |
| `src/types/domain.ts` | 데이터 모양 (Board, Comment, User …) |
