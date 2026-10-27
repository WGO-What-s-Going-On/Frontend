import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { initialBoards, initialComments, initialNotices, initialUser } from '../data/mockData'
import { boardIdFromPath, pathForScreen, screenFromPath } from '../navigation'
import { RADIUS, mapSeedBoards } from '../features/map/mapWorld'
import { pickCandidates } from '../features/board/commentVote'
import { myCommentReactions, myReactions } from '../types/domain'
import type { Board, Category, Comment, CommentReaction, Notice, PostReaction, Report, Screen, User } from '../types/domain'

interface BoardInput { category: Category; title: string; body: string; imageName?: string; anonymous?: boolean }
export type LocationPermission = 'unknown' | 'granted' | 'denied'
// 화면 모드: 라이트(기본) · 다크
export type ThemeMode = 'light' | 'dark'
// 알림 종류별 수신 설정 (NTF 도메인). 게시판별 알림은 alertBoardIds로 따로 관리한다.
export interface NotificationSettings { nearby: boolean; replies: boolean; reactions: boolean; lifecycle: boolean }

interface PersistedMockState {
  user: User
  boards: Board[]
  comments: Comment[]
  notices: Notice[]
  reports: Report[]
  currentBoardId: string
  inRange: boolean
  blockedUsers: string[]
  // 알림을 켠 게시판. 게시판 알림은 기본으로 꺼져 있고, 사용자가 켠 게시판만 담는다.
  alertBoardIds: string[]
  recentBoardIds: string[]
  notificationSettings: NotificationSettings
  locationPermission: LocationPermission
  themeMode?: ThemeMode
  noticesVersion?: number
  mapSeed?: number
}

const STORAGE_KEY = 'wgo-mockup-state-v1'
// 목업 알림 목록을 바꾸면 올린다. 저장된 알림 버전이 다르면 알림만 새 목업으로 교체한다.
const NOTICES_VERSION = 5
// 지도 주변 동네 게시판 목업을 추가할 때 올린다. 저장된 게시판에 없는 목업만 덧붙인다.
const MAP_SEED = 3

// 화면 겹쳐 전환(View Transition)을 쓸 수 있는지. 지원하지 않거나 동작 줄이기면 바로 바뀐다.
export function canViewTransition() {
  return typeof document !== 'undefined' && 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readPersistedState(): Partial<PersistedMockState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return {}
  }
}

interface AppContextValue {
  screen: Screen
  user: User
  boards: Board[]
  comments: Comment[]
  notices: Notice[]
  reports: Report[]
  currentBoard?: Board
  inRange: boolean
  blockedUsers: string[]
  alertBoardIds: string[]
  recentBoardIds: string[]
  notificationSettings: NotificationSettings
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
  locationPermission: LocationPermission
  toast: string
  go: (screen: Screen) => void
  back: (fallback?: Screen) => void
  withBackTransition: (run: () => void) => void
  openBoard: (id: string) => void
  startLogin: () => void
  agreeTerms: () => void
  completeNickname: (nickname: string) => void
  setLocationPermission: (permission: LocationPermission) => void
  updateComment: (id: string, body: string) => void
  setInRange: (value: boolean) => void
  createBoard: (input: BoardInput) => void
  updateBoard: (id: string, input: Pick<BoardInput, 'title' | 'body' | 'category' | 'anonymous' | 'imageName'>) => void
  deleteBoard: (id: string) => void
  finishBoard: (id: string) => void
  reopenBoard: (id: string) => void
  reactToBoard: (id: string, reaction: PostReaction) => void
  addComment: (body: string, parentId?: string, imageUrl?: string) => void
  deleteComment: (id: string) => void
  markCommentRead: (id: string) => void
  reactToComment: (id: string, reaction: CommentReaction) => void
  startVote: (boardId: string) => void
  castVote: (boardId: string, commentId: string) => void
  toggleCommentLike: (id: string) => void
  updateUser: (input: Pick<User, 'nickname' | 'realName'>) => void
  markNoticeRead: (id: string) => void
  markAllNoticesRead: () => void
  deleteNotice: (id: string) => void
  reportTarget: (targetType: Report['targetType'], targetId: string, reason: string) => void
  blockUser: (userId: string) => void
  toggleBoardNotifications: (boardId: string) => void
  updateNotificationSettings: (settings: NotificationSettings) => void
  resolveReport: (id: string, hideTarget: boolean) => void
  showToast: (message: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const persisted = useMemo(readPersistedState, [])
  const screen = screenFromPath(location.pathname)
  const [user, setUser] = useState(persisted.user ?? initialUser)
  const [boards, setBoards] = useState<Board[]>(() => {
    const saved = persisted.boards ?? initialBoards
    if (persisted.mapSeed === MAP_SEED) return saved
    const ids = new Set(saved.map((board) => board.id))
    // 이미 저장된 목업 게시판도 새 예시(사진 자리·긴 본문)로 맞춘다. 사용자가 고친 글은 그대로 둔다
    const latest = new Map([...initialBoards, ...mapSeedBoards].map((board) => [board.id, board]))
    const patched = saved.map((board) => { const seed = latest.get(board.id); return seed && !board.edited ? { ...board, body: seed.body, imagePlaceholder: seed.imagePlaceholder } : board })
    return [...patched, ...mapSeedBoards.filter((board) => !ids.has(board.id))]
  })
  const [comments, setComments] = useState(persisted.comments ?? initialComments)
  const [notices, setNotices] = useState(persisted.noticesVersion === NOTICES_VERSION && persisted.notices ? persisted.notices : initialNotices)
  const [reports, setReports] = useState<Report[]>(persisted.reports ?? [])
  const [storedBoardId, setCurrentBoardId] = useState(persisted.currentBoardId ?? 'fire')
  const currentBoardId = boardIdFromPath(location.pathname) ?? storedBoardId
  const [inRange, setInRange] = useState(persisted.inRange ?? true)
  const [blockedUsers, setBlockedUsers] = useState<string[]>(persisted.blockedUsers ?? [])
  const [alertBoardIds, setAlertBoardIds] = useState<string[]>(persisted.alertBoardIds ?? [])
  const [recentBoardIds, setRecentBoardIds] = useState<string[]>(persisted.recentBoardIds ?? [])
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ nearby: true, replies: true, reactions: true, lifecycle: true, ...persisted.notificationSettings })
  const [locationPermission, setLocationPermissionState] = useState<LocationPermission>(persisted.locationPermission ?? 'unknown')
  const [themeMode, setThemeMode] = useState<ThemeMode>(persisted.themeMode === 'dark' ? 'dark' : 'light')
  const [toast, setToast] = useState('')

  // 화면 모드를 <html data-theme>에 반영한다 (첫 그림 전 적용은 index.html 스크립트가 한다).
  // 그리기 전에 반영해야 아래 toggleTheme의 겹쳐 전환이 바뀐 색을 찍는다
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = themeMode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeMode === 'dark' ? '#2a2d34' : '#ffffff')
  }, [themeMode])

  useEffect(() => {
    const state: PersistedMockState = { noticesVersion: NOTICES_VERSION, mapSeed: MAP_SEED, user, boards, comments, notices, reports, currentBoardId, inRange, blockedUsers, alertBoardIds, recentBoardIds, notificationSettings, locationPermission, themeMode }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [user, boards, comments, notices, reports, currentBoardId, inRange, blockedUsers, alertBoardIds, recentBoardIds, notificationSettings, locationPermission, themeMode])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 1200)
  }
  const go = (next: Screen) => navigate(pathForScreen(next, currentBoardId))
  // 뒤로 가기 전환: 화면이 실제로 바뀐 뒤(아래 useLayoutEffect)에 겹쳐 전환을 마친다.
  // 뒤로 가기(navigate(-1))는 바로 반영되지 않아서, 주소가 바뀌는 순간을 기다렸다가 새 화면을 찍는다.
  const navigationDone = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    navigationDone.current?.()
    navigationDone.current = null
  }, [location.key])
  const withBackTransition = (run: () => void) => {
    if (!canViewTransition()) { run(); return }
    const root = document.documentElement
    root.dataset.nav = 'back'
    const transition = document.startViewTransition(() => new Promise<void>((resolve) => {
      navigationDone.current = resolve
      // 주소가 그대로면 기다리지 않는다
      window.setTimeout(resolve, 400)
      run()
    }))
    transition.finished.finally(() => { delete root.dataset.nav })
  }
  // 라이트 ↔ 다크: 색이 툭 바뀌지 않게 짧게 겹쳐 전환한다
  const toggleTheme = () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : 'dark'
    if (canViewTransition()) document.startViewTransition(() => flushSync(() => setThemeMode(next)))
    else setThemeMode(next)
  }
  const back = (fallback: Screen = 'board') => withBackTransition(() => location.key === 'default' ? go(fallback) : navigate(-1))
  // 게시글 열기: 목록·지도·알림·검색·최근 활동 어디서 열어도 같은 전환으로 넘어간다
  const openBoard = (id: string) => {
    const target = boards.find((board) => board.id === id)
    const open = () => {
      setCurrentBoardId(id)
      setRecentBoardIds((items) => [id, ...items.filter((item) => item !== id)])
      // 150m 밖 게시판은 열람 전용으로 (MAP-F05)
      navigate(pathForScreen(inRange && (target?.distance ?? 0) <= RADIUS ? 'detail' : 'outside', id), { state: { enter: true } })
    }
    if (canViewTransition()) document.startViewTransition(() => flushSync(open))
    else open()
  }
  // 로그인 흐름: 처음이면 약관 → 닉네임 → 위치 권한, 이후에는 바로 지도 (실제 카카오 인증은 백엔드 연동 때)
  const startLogin = () => go(!user.onboarded ? 'terms' : locationPermission === 'unknown' ? 'location-permission' : 'home')
  const agreeTerms = () => go('nickname')
  const completeNickname = (nickname: string) => { setUser((value) => ({ ...value, nickname, onboarded: true })); go('location-permission') }
  const setLocationPermission = (permission: LocationPermission) => {
    setLocationPermissionState(permission)
    // 위치 권한이 없으면 150m 판정을 할 수 없어 열람만 가능하다 (MAP-F01, MAP-F05)
    setInRange(permission === 'granted')
    go('home')
  }
  const createBoard = (input: BoardInput) => {
    const id = `board-${Date.now()}`
    // 새 글 추가와 화면 이동을 한 번에 반영해야 전환 직전 화면(작성 시트)에서 바로 상세로 겹쳐 넘어간다
    const open = () => {
      setBoards((items) => [{
        id, authorId: user.id, authorName: input.anonymous ? '익명' : user.nickname, distance: 0, createdAt: '방금 전', status: '실시간', views: 1,
        reactions: { '저도 궁금해요': 0, '지금도 그래요': 0, '도움 됐어요': 0, '이제 끝났어요': 0 }, ...input,
      }, ...items])
      setCurrentBoardId(id)
      navigate(pathForScreen('detail', id), { state: { enter: true } })
    }
    if (canViewTransition()) document.startViewTransition(() => flushSync(open))
    else open()
    showToast('게시판이 생성되었습니다.')
  }
  const updateBoard = (id: string, input: Pick<BoardInput, 'title' | 'body' | 'category' | 'anonymous' | 'imageName'>) => {
    setBoards((items) => items.map((board) => {
      if (board.id !== id) return board
      const anonymous = input.anonymous ?? Boolean(board.anonymous)
      const changed = board.title !== input.title || board.body !== input.body || board.category !== input.category || Boolean(board.anonymous) !== anonymous || board.imageName !== input.imageName
      // 작성자 표시(닉네임/익명)를 바꾸면 보이는 이름도 함께 바꾼다
      return changed ? { ...board, ...input, anonymous, authorName: anonymous ? '익명' : user.nickname, edited: true } : board
    }))
    showToast('게시글을 수정했습니다.')
  }
  const deleteBoard = (id: string) => { setBoards((items) => items.filter((board) => board.id !== id)); showToast('게시글을 삭제했습니다.'); go('board') }
  const reopenBoard = (id: string) => { setBoards((items) => items.map((board) => board.id === id ? { ...board, status: '실시간' } : board)); showToast('게시판을 다시 열었어요.') }
  const finishBoard = (id: string) => { setBoards((items) => items.map((board) => board.id === id ? { ...board, status: '종료됨' } : board)); showToast('게시판을 종료했습니다.') }
  const reactToBoard = (id: string, reaction: PostReaction) => setBoards((items) => items.map((board) => {
    if (board.id !== id) return board
    // 백엔드 규칙: 한 사람은 게시글당 공감을 하나만. 같은 걸 다시 누르면 취소, 다른 걸 누르면 기존 공감을 취소하고 옮긴다
    const mine = myReactions(board)
    const pressed = mine.includes(reaction)
    const reactions = { ...board.reactions }
    mine.forEach((item) => { reactions[item] = Math.max(0, reactions[item] - 1) })
    if (!pressed) reactions[reaction] += 1
    return { ...board, reactions, myReactions: pressed ? [] : [reaction], reactedByMe: undefined }
  }))
  const addComment = (body: string, parentId?: string, imageUrl?: string) => {
    setComments((items) => [...items, { id: `comment-${Date.now()}`, boardId: currentBoardId, authorId: user.id, authorName: user.nickname, body, imageUrl, read: true, createdAt: '방금 전', verified: inRange, parentId, reactions: { '도움돼요': 0, '맞아요': 0, '정보가 달라요': 0 } }])
    showToast('댓글을 등록했습니다.')
  }
  const updateComment = (id: string, body: string) => { setComments((items) => items.map((comment) => comment.id === id ? { ...comment, body, edited: true } : comment)); showToast('댓글을 수정했습니다.') }
  // 투표 중인 후보 댓글이 지워지면 그 투표는 취소된다 (이미 끝난 투표는 그대로)
  const cancelVoteFor = (commentId: string) => setBoards((items) => items.map((board) => board.status === '실시간' && board.vote && board.vote.candidates.some((candidate) => candidate.commentId === commentId) ? { ...board, vote: { ...board.vote, cancelled: true } } : board))
  const deleteComment = (id: string) => { setComments((items) => items.filter((comment) => comment.id !== id)); cancelVoteFor(id) }
  const markCommentRead = (id: string) => setComments((items) => items.map((comment) => comment.id === id ? { ...comment, read: true } : comment))
  const toggleCommentLike = (id: string) => setComments((items) => items.map((comment) => comment.id === id ? { ...comment, likedByMe: !comment.likedByMe, likes: Math.max(0, (comment.likes ?? 0) + (comment.likedByMe ? -1 : 1)) } : comment))
  const reactToComment = (id: string, reaction: CommentReaction) => setComments((items) => items.map((comment) => {
    if (comment.id !== id) return comment
    // 백엔드 규칙: 한 사람은 댓글당 공감을 하나만. 같은 걸 다시 누르면 취소, 다른 걸 누르면 옮긴다
    const mine = myCommentReactions(comment)
    const pressed = mine.includes(reaction)
    const reactions = { ...comment.reactions }
    mine.forEach((item) => { reactions[item] = Math.max(0, reactions[item] - 1) })
    if (!pressed) reactions[reaction] += 1
    return { ...comment, reactions, myReactions: pressed ? [] : [reaction], reactedByMe: undefined }
  }))
  // 글 작성 30분 뒤: 그때 공감이 많은 댓글 2개를 후보로 고정한다 (백엔드에서는 워커가 한다)
  const startVote = (boardId: string) => setBoards((items) => items.map((board) => board.id === boardId && !board.vote ? { ...board, vote: { candidates: pickCandidates(comments.filter((comment) => comment.boardId === boardId)) } } : board))
  // 한 사람 한 표: 다른 후보를 누르면 표를 옮기고, 내 후보를 다시 누르면 취소한다
  const castVote = (boardId: string, commentId: string) => setBoards((items) => items.map((board) => {
    if (board.id !== boardId || !board.vote) return board
    const { mine } = board.vote
    const next = mine === commentId ? undefined : commentId
    const candidates = board.vote.candidates.map((candidate) => ({ ...candidate, votes: candidate.votes - (candidate.commentId === mine ? 1 : 0) + (candidate.commentId === next ? 1 : 0) }))
    return { ...board, vote: { ...board.vote, candidates, mine: next } }
  }))
  const updateUser = (input: Pick<User, 'nickname' | 'realName'>) => { setUser((value) => ({ ...value, ...input })); showToast('프로필을 저장했습니다.'); go('my') }
  const markNoticeRead = (id: string) => setNotices((items) => items.map((notice) => notice.id === id ? { ...notice, read: true } : notice))
  const markAllNoticesRead = () => setNotices((items) => items.map((notice) => ({ ...notice, read: true })))
  const deleteNotice = (id: string) => setNotices((items) => items.filter((notice) => notice.id !== id))
  const reportTarget = (targetType: Report['targetType'], targetId: string, reason: string) => { setReports((items) => [...items, { id: `report-${Date.now()}`, targetType, targetId, reason, status: '접수' }]); showToast('신고가 접수되었습니다.') }
  const blockUser = (userId: string) => { setBlockedUsers((items) => [...new Set([...items, userId])]); showToast('사용자를 차단했습니다.') }
  const toggleBoardNotifications = (boardId: string) => setAlertBoardIds((items) => items.includes(boardId) ? items.filter((id) => id !== boardId) : [...items, boardId])
  const updateNotificationSettings = (settings: NotificationSettings) => setNotificationSettings(settings)
  const resolveReport = (id: string, hideTarget: boolean) => {
    const report = reports.find((item) => item.id === id)
    if (hideTarget && report?.targetType === '게시글') setBoards((items) => items.map((board) => board.id === report.targetId ? { ...board, status: '숨김' } : board))
    if (hideTarget && report?.targetType === '댓글') { setComments((items) => items.filter((comment) => comment.id !== report.targetId)); cancelVoteFor(report.targetId) }
    setReports((items) => items.map((item) => item.id === id ? { ...item, status: '처리 완료' } : item))
  }
  const value = useMemo<AppContextValue>(() => ({
    screen, user, boards, comments, notices, reports, currentBoard: boards.find((board) => board.id === currentBoardId), inRange, blockedUsers, alertBoardIds, recentBoardIds, notificationSettings, themeMode, setThemeMode, toggleTheme, locationPermission, toast,
    go, back, withBackTransition, openBoard, startLogin, agreeTerms, completeNickname, setLocationPermission, updateComment, setInRange, createBoard, updateBoard, deleteBoard, finishBoard, reopenBoard, reactToBoard, addComment, deleteComment, markCommentRead, reactToComment, toggleCommentLike, startVote, castVote,
    updateUser, markNoticeRead, markAllNoticesRead, deleteNotice, reportTarget, blockUser, toggleBoardNotifications, updateNotificationSettings, resolveReport, showToast,
  }), [screen, user, boards, comments, notices, reports, currentBoardId, inRange, blockedUsers, alertBoardIds, recentBoardIds, notificationSettings, themeMode, locationPermission, toast])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}
