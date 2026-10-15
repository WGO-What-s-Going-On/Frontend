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
