import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { initialBoards, initialComments, initialNotices, initialUser } from '../data/mockData'
import { boardIdFromPath, pathForScreen, screenFromPath } from '../navigation'
import { RADIUS, mapSeedBoards, type Point } from '../features/map/mapWorld'
import { pickCandidates } from '../features/board/commentVote'
import { apiEnabled, kakaoEnabled } from '../api/config'
import { ApiError, SESSION_EXPIRED_EVENT } from '../api/client'
import { kakaoAuthorizeUrl, loginWithKakao, logout as logoutApi } from '../api/auth'
import { clearSession, readSession } from '../api/session'
import { startPush, stopPush } from '../api/push'
import { startWebPush, unregisterWebPush } from '../api/webPush'
import { getMyProfileImage, removeProfileImage as removeProfileImageApi, shrinkImage, uploadProfileImage } from '../api/profileImage'
import { consentTerms, getMe, getTerms, requestWithdrawal, updateMe } from '../api/users'
import type { MeResponse } from '../api/users'
import { useServerSync, type RankingView } from './useServerSync'
import type { LevelStats } from '../features/level/levels'
import { myCommentReactions, myReactions } from '../types/domain'
import type { Board, Category, Comment, CommentReaction, Notice, PostReaction, Reach, Report, Screen, User } from '../types/domain'

// onStage: 서버에 올리는 단계(사진 올리기 → 게시)를 글쓰기 버튼에 알린다
interface BoardInput { category: Category; title: string; body: string; imageName?: string; imageFile?: File; anonymous?: boolean; reach?: Reach; onStage?: (stage: 'upload' | 'post') => void }
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
  // 지금 주소의 게시물이 삭제돼 서버에 없음 (상세에서 빈 화면 대신 안내)
  currentBoardMissing: boolean
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
  finishKakaoLogin: (code: string) => Promise<void>
  agreeTerms: () => Promise<void>
  completeNickname: (nickname: string) => Promise<void>
  logout: () => Promise<void>
  withdraw: () => Promise<void>
  setLocationPermission: (permission: LocationPermission) => void
  updateComment: (id: string, body: string) => void
  setInRange: (value: boolean) => void
  relocate: (boardId: string) => void
  // 당겨서 새로고침: 게시글 상세 · 알림을 서버에서 다시 받는다 (목업이면 바로 끝)
  refreshBoard: (boardId: string) => Promise<void>
  refreshNotices: () => Promise<void>
  // 서버 연동 중에는 올리기가 끝날 때까지 기다릴 수 있게 Promise를 돌려준다 (실패하면 reject)
  createBoard: (input: BoardInput) => void | Promise<void>
  updateBoard: (id: string, input: Pick<BoardInput, 'title' | 'body' | 'category' | 'anonymous' | 'imageName'>) => void
  deleteBoard: (id: string) => void
  finishBoard: (id: string) => void
  reopenBoard: (id: string) => void
  reactToBoard: (id: string, reaction: PostReaction) => void
  addComment: (body: string, parentId?: string, imageUrl?: string, imageFile?: File) => void | Promise<void>
  deleteComment: (id: string) => void
  markCommentRead: (id: string) => void
  reactToComment: (id: string, reaction: CommentReaction) => void
  startVote: (boardId: string) => void
  castVote: (boardId: string, commentId: string) => void
  toggleCommentLike: (id: string) => void
  updateUser: (input: Pick<User, 'nickname' | 'realName'>) => Promise<void>
  // 내 프로필 사진 주소 (없으면 기본 아바타). 서버 주소는 서명된 값이라 기기에 저장하지 않는다
  profileImageUrl: string | null
  changeProfileImage: (file: File) => Promise<void>
  removeProfileImage: () => Promise<void>
  markNoticeRead: (id: string) => void
  markAllNoticesRead: () => void
  deleteNotice: (id: string) => void
  reportTarget: (targetType: Report['targetType'], targetId: string, reason: string) => void
  blockUser: (userId: string) => void
  toggleBoardNotifications: (boardId: string) => void
  updateNotificationSettings: (settings: NotificationSettings) => void
  resolveReport: (id: string, hideTarget: boolean) => void
  showToast: (message: string) => void
  // 실제 서버 연동 상태 (VITE_SERVER_POSTS=true이고 로그인했을 때)
  live: boolean
  boardsLoading: boolean
  boardsError: boolean
  reloadBoards: () => void | Promise<unknown>
  serverLevel: LevelStats | null
  // 서버 연동 중 받은 뱃지 이름 (목업이면 null → 화면에서 계산)
  serverBadges: string[] | null
  // 서버 연동 중 안 읽은 알림 수 (목업이면 null → 목록에서 셈)
  serverUnread: number | null
  loadRanking: () => Promise<RankingView>
  findSimilar: (draft: { category: Category; title: string; body: string; reach?: Reach }) => Promise<Board[]>
  // 서버 연동 중 지도 옮긴 곳 주변 글 다시 받기 (찾은 개수)
  searchArea: (center: Point) => Promise<number>
  // 서버 연동 중 최근 활동 (작성 · 댓글 · 반응한 게시판 id)
  loadActivity: () => Promise<{ written: string[]; commented: string[]; reacted: string[] }>
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
  // 서버 연동 중: 서버는 게시판별 알림이 기본 켜짐이라 '끈 게시판'만 기억한다. 차단 목록도 서버 것을 따로 둔다 (목업 저장값과 섞지 않음)
  const [mutedBoardIds, setMutedBoardIds] = useState<string[]>([])
  const [serverBlocked, setServerBlocked] = useState<string[]>([])
  const [recentBoardIds, setRecentBoardIds] = useState<string[]>(persisted.recentBoardIds ?? [])
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ nearby: true, replies: true, reactions: true, lifecycle: true, ...persisted.notificationSettings })
  const [locationPermission, setLocationPermissionState] = useState<LocationPermission>(persisted.locationPermission ?? 'unknown')
  const [themeMode, setThemeMode] = useState<ThemeMode>(persisted.themeMode === 'dark' ? 'dark' : 'light')
  const [toast, setToast] = useState('')
  // 서버에서 찾을 수 없는(삭제된) 게시물
  const [missingBoardIds, setMissingBoardIds] = useState<Set<string>>(new Set())
  // 실시간 콜백에서 지금 보고 있는 화면을 읽는다 (콜백은 연결 때 한 번 만들어진다)
  const view = useRef({ screen, currentBoardId })
  view.current = { screen, currentBoardId }
  const server = useServerSync({
    setBoards, setComments, setNotices, setNotificationSettings,
    onBoardDeleted: (boardId) => {
      if (view.current.currentBoardId !== boardId || (view.current.screen !== 'detail' && view.current.screen !== 'outside')) return
      showToast('작성자가 게시글을 삭제했어요.')
      navigate(pathForScreen('board', boardId), { replace: true })
    },
  })
  // 서버 데이터는 목업 저장소에 섞지 않는다: 서버 연동 중에는 마지막 목업 글 · 댓글 · 알림을 그대로 저장해 둔다
  const mockData = useRef({ boards, comments, notices })
  if (!server.live) mockData.current = { boards, comments, notices }

  // 화면 모드를 <html data-theme>에 반영한다 (첫 그림 전 적용은 index.html 스크립트가 한다).
  // 그리기 전에 반영해야 아래 toggleTheme의 겹쳐 전환이 바뀐 색을 찍는다
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = themeMode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeMode === 'dark' ? '#2a2d34' : '#ffffff')
  }, [themeMode])

  useEffect(() => {
    const state: PersistedMockState = { noticesVersion: NOTICES_VERSION, mapSeed: MAP_SEED, user, ...mockData.current, reports, currentBoardId, inRange, blockedUsers, alertBoardIds, recentBoardIds, notificationSettings, locationPermission, themeMode }
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
  // 로그인 다음 화면: 처음이면 약관 → 닉네임 → 위치 권한, 이후에는 바로 지도
  const afterLogin = (onboarded: boolean) => go(!onboarded ? 'terms' : locationPermission === 'unknown' ? 'location-permission' : 'home')
  // 실제 서버 사용자 정보를 앱 사용자에 반영 (목업 글의 작성자 비교용 id는 그대로).
  // 실명은 서버 값만 쓴다: 비어 있을 때 목업 실명이 남으면 화면에 보이고 저장할 때 서버로 올라간다
  const applyMe = (me: MeResponse) => setUser((value) => ({ ...value, serverId: me.userId, nickname: me.nickname || value.nickname, realName: me.realName ?? undefined, onboarded: !me.onboardingRequired }))
  // 카카오 앱 키가 있으면 카카오 인가 화면으로, 없으면 목업 로그인 (실제 인증은 /auth/kakao/callback에서 이어진다)
  const startLogin = () => {
    if (kakaoEnabled) { window.location.assign(kakaoAuthorizeUrl()); return }
    afterLogin(Boolean(user.onboarded))
  }
  const finishKakaoLogin = async (code: string) => {
    const result = await loginWithKakao(code)
    const me = await getMe()
    applyMe(me)
    if (result.restoredFromWithdrawal) showToast('탈퇴 신청을 취소하고 다시 로그인했어요.')
    afterLogin(!result.onboardingRequired && !me.onboardingRequired)
  }
  // 약관 동의: 로그인했으면 서버에 현재 필수 약관 동의를 보낸다 (서버 약관 목록이 비어 있으면 보낼 것이 없어 건너뛴다)
  const agreeTerms = async () => {
    if (apiEnabled && readSession()) {
      // 약관 목록을 못 받으면(staging 404 등) 동의 저장 없이 넘어간다. 동의 저장 자체가 실패하면 멈춘다
      const terms = await getTerms().catch(() => [])
      const termIds = terms.filter((term) => term.required).map((term) => term.termId)
      if (termIds.length) {
        try { await consentTerms(termIds) } catch { showToast('약관 동의를 저장하지 못했어요. 다시 시도해 주세요.'); return }
      }
    }
    go('nickname')
  }
  // 닉네임: 로그인했으면 서버에 저장 (이미 쓰는 이름이면 409)
  const completeNickname = async (nickname: string) => {
    if (apiEnabled && readSession()) {
      try { applyMe(await updateMe({ nickname })) } catch (error) {
        showToast(error instanceof ApiError && error.status === 409 ? '이미 사용 중인 닉네임이에요.' : '닉네임을 저장하지 못했어요. 다시 시도해 주세요.')
        return
      }
    }
    setUser((value) => ({ ...value, nickname, onboarded: true }))
    go('location-permission')
  }
  // 회원 탈퇴: 서버는 30일 복구 기간을 두고 refresh 세션만 지운다(이미 받은 access 토큰은 만료 전까지 유효) → 기기의 세션도 바로 지운다
  const withdraw = async () => {
    if (apiEnabled && readSession()) {
      try { await requestWithdrawal() } catch { showToast('탈퇴를 처리하지 못했어요. 다시 시도해 주세요.'); return }
      server.stopRealtime()
      await stopPush()
      await unregisterWebPush()
      pushStarted.current = false
      clearSession()
    }
    setUser((value) => ({ ...value, serverId: undefined }))
    showToast('회원 탈퇴 처리되었습니다.')
    go('login')
  }
  const logout = async () => {
    server.stopRealtime()
    await stopPush()
    await unregisterWebPush()
    pushStarted.current = false
    await logoutApi()
    setUser((value) => ({ ...value, serverId: undefined }))
    showToast('로그아웃했습니다.')
    go('login')
  }
  // 앱을 켰을 때 로그인 상태면 서버의 내 정보로 맞춘다 (토큰이 끝났으면 갱신, 실패하면 로그인 화면으로).
  // 첫 주소(/)는 로그인 화면이라, 저장된 로그인이 있으면 카카오 버튼을 보여 주지 않고 바로 다음 화면으로 넘긴다
  useEffect(() => {
    if (!apiEnabled || !readSession()) return
    const atLogin = screen === 'login'
    const skipLogin = (onboarded: boolean) => navigate(pathForScreen(!onboarded ? 'terms' : locationPermission === 'unknown' ? 'location-permission' : 'home', currentBoardId), { replace: true })
    if (atLogin && user.onboarded) skipLogin(true)
    getMe().then((me) => {
      applyMe(me)
      if (atLogin && !user.onboarded) skipLogin(!me.onboardingRequired)
    }).catch((error) => { if (error instanceof ApiError && error.status === 401) { setUser((value) => ({ ...value, serverId: undefined })); go('login') } })
  }, [])
  const setLocationPermission = (permission: LocationPermission) => {
    setLocationPermissionState(permission)
    // 위치 권한이 없으면 150m 판정을 할 수 없어 열람만 가능하다 (MAP-F01, MAP-F05)
    setInRange(permission === 'granted')
    go('home')
  }
  // 범위 밖 게시판에서 당겨서 새로고침: 위치를 다시 잡고, 150m 안이면 바로 참여 화면으로 바꾼다.
  // 실제로는 GPS를 다시 읽어 거리를 새로 계산한다. 목업은 걸어갈 수 없어서 그 게시판 쪽으로 걸어와 범위 안에 들어온 것으로 친다
  const relocate = (boardId: string) => {
    if (locationPermission !== 'granted') { showToast('위치 권한이 꺼져 있어요'); return }
    setInRange(true)
    setBoards((items) => items.map((board) => board.id === boardId && board.distance > RADIUS ? { ...board, distance: RADIUS - 20 } : board))
    navigate(pathForScreen('detail', boardId), { replace: true })
    showToast('150m 안이에요. 이제 참여할 수 있어요')
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
  // 삭제한 글을 보고 있었으면 게시판으로, 목록(최근 활동 등)에서 지웠으면 그 화면에 그대로
  const leaveDeleted = (id: string) => { if ((view.current.screen === 'detail' || view.current.screen === 'outside') && view.current.currentBoardId === id) go('board') }
  const deleteBoard = (id: string) => { setBoards((items) => items.filter((board) => board.id !== id)); showToast('게시글을 삭제했습니다.'); leaveDeleted(id) }
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
  const updateUser = async (input: Pick<User, 'nickname' | 'realName'>) => {
    // 실명은 본인에게만 보이는 값으로 서버에 저장된다. 닉네임은 바뀌었을 때만 보낸다
    if (apiEnabled && readSession()) {
      try { applyMe(await updateMe({ ...(input.nickname !== user.nickname ? { nickname: input.nickname } : {}), realName: input.realName?.trim() || null })) } catch (error) {
        showToast(error instanceof ApiError && error.status === 409 ? '이미 사용 중인 닉네임이에요.' : '프로필을 저장하지 못했어요.')
        return
      }
    }
    setUser((value) => ({ ...value, ...input })); showToast('프로필을 저장했습니다.'); go('my')
  }
  // 프로필 사진: 서버 연동 중이면 서버에 올리고 보기 주소를 받는다(주소는 만료 전에 다시 받는다). 목업이면 이 기기에서만 보인다
  const [profileImage, setProfileImage] = useState<{ url: string; expiresAt: number } | null>(null)
  const applyProfileImage = (image: { url: string | null; expiresAt: string | null }) => setProfileImage(image.url ? { url: image.url, expiresAt: image.expiresAt ? Date.parse(image.expiresAt) : Infinity } : null)
  useEffect(() => {
    if (!server.live) { setProfileImage(null); return }
    getMyProfileImage().then(applyProfileImage).catch(() => undefined)
  }, [server.live])
  useEffect(() => {
    if (!server.live || !profileImage || !Number.isFinite(profileImage.expiresAt)) return
    const timer = window.setTimeout(() => { getMyProfileImage().then(applyProfileImage).catch(() => undefined) }, Math.max(5_000, profileImage.expiresAt - Date.now() - 30_000))
    return () => window.clearTimeout(timer)
  }, [server.live, profileImage])
  const changeProfileImage = async (file: File) => {
    try {
      if (server.live) applyProfileImage(await uploadProfileImage(file))
      else setProfileImage({ url: URL.createObjectURL(await shrinkImage(file)), expiresAt: Infinity })
      showToast('프로필 사진을 바꿨어요.')
    } catch (error) {
      showToast(error instanceof ApiError && error.status === 400 && error.message ? error.message : '프로필 사진을 바꾸지 못했어요. 다시 시도해 주세요.')
    }
  }
  const removeProfileImage = async () => {
    try {
      if (server.live) await removeProfileImageApi()
      setProfileImage(null)
      showToast('프로필 사진을 지웠어요.')
    } catch { showToast('프로필 사진을 지우지 못했어요.') }
  }
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
  // 실제 서버 연동: 켜져 있으면 아래 동작은 서버로 보내고, 결과를 다시 받아 화면에 반영한다 (목업 동작을 덮어쓴다)
  const fail = (message: string) => () => showToast(message)
  // 사진 문제(형식 · 크기 · 업로드 실패)는 그 내용을 그대로 안내한다
  const mediaMessage = (error: unknown) => error instanceof ApiError && error.code.startsWith('MEDIA_') ? error.message : null
  const commentOf = (id: string) => comments.find((comment) => comment.id === id)
  const liveActions: Partial<AppContextValue> = !server.live ? {} : {
    relocate: (boardId) => {
      server.locate().then(() => server.loadBoard(boardId)).then((board) => {
        const ok = inRange && board.distance <= RADIUS
        navigate(pathForScreen(ok ? 'detail' : 'outside', boardId), { replace: true })
        showToast(ok ? '150m 안이에요. 이제 참여할 수 있어요' : `아직 범위 밖이에요 · ${board.distance}m`)
      }).catch(fail('위치를 확인하지 못했어요.'))
    },
    createBoard: (input) => server.createPost(input).then((id) => {
      setCurrentBoardId(id)
      navigate(pathForScreen('detail', id), { state: { enter: true } })
      showToast('게시판이 생성되었습니다.')
    }).catch((error) => { showToast(mediaMessage(error) ?? '글을 올리지 못했어요. 다시 시도해 주세요.'); throw error }),
    // 서버는 제목 · 본문만 수정할 수 있다 (카테고리 · 작성자 표시 · 사진은 그대로)
    updateBoard: (id, input) => { server.editPost(id, input.title, input.body).then(() => showToast('게시글을 수정했습니다.')).catch(fail('게시글을 수정하지 못했어요.')) },
    deleteBoard: (id) => { server.deletePost(id).then(() => { showToast('게시글을 삭제했습니다.'); leaveDeleted(id) }).catch(fail('게시글을 삭제하지 못했어요.')) },
    finishBoard: (id) => { server.setClosed(id, true).then(() => showToast('게시판을 종료했습니다.')).catch(fail('게시판을 종료하지 못했어요.')) },
    reopenBoard: (id) => { server.setClosed(id, false).then(() => showToast('게시판을 다시 열었어요.')).catch(fail('게시판을 다시 열지 못했어요.')) },
    reactToBoard: (id, reaction) => { const board = boards.find((item) => item.id === id); server.reactToPost(id, reaction, board ? myReactions(board)[0] : undefined).catch(fail('반응을 남기지 못했어요.')) },
    addComment: (body, parentId, _imageUrl, imageFile) => server.addComment(currentBoardId, body, parentId, imageFile)
      .then(() => showToast('댓글을 등록했습니다.'))
      .catch((error) => { showToast(mediaMessage(error) ?? '댓글을 등록하지 못했어요.'); throw error }),
    updateComment: (id, body) => { const comment = commentOf(id); if (comment) server.editComment(comment.boardId, id, body).then(() => showToast('댓글을 수정했습니다.')).catch(fail('댓글을 수정하지 못했어요.')) },
    deleteComment: (id) => { const comment = commentOf(id); if (comment) server.deleteComment(comment.boardId, id).catch(fail('댓글을 삭제하지 못했어요.')) },
    reactToComment: (id, reaction) => { const comment = commentOf(id); if (comment) server.reactToComment(comment.boardId, id, reaction, myCommentReactions(comment)[0]).catch(fail('공감을 남기지 못했어요.')) },
    // 투표 후보는 서버가 고른다
    startVote: () => undefined,
    castVote: (boardId, commentId) => { server.castVote(boardId, commentId, boards.find((board) => board.id === boardId)?.vote?.mine).catch(fail('투표하지 못했어요.')) },
    markNoticeRead: (id) => { markNoticeRead(id); server.readNotice(id).then(server.loadUnread).catch(() => undefined) },
    markAllNoticesRead: () => { markAllNoticesRead(); server.readAllNotices().then(server.loadUnread).catch(fail('알림을 읽음 처리하지 못했어요.')) },
    deleteNotice: (id) => { deleteNotice(id); server.removeNotice(id).then(server.loadUnread).catch(fail('알림을 삭제하지 못했어요.')) },
    // 신고: 댓글은 그 댓글이 달린 게시글 ID도 함께 보낸다
    reportTarget: (targetType, targetId, reason) => {
      const target = targetType === '댓글' ? { postId: commentOf(targetId)?.boardId ?? currentBoardId, commentId: targetId } : { postId: targetId }
      server.report(target, reason).then(() => showToast('신고가 접수되었습니다.'))
        .catch((error) => showToast(error instanceof ApiError && error.status === 503 ? '지금은 신고를 받을 수 없어요. 잠시 후 다시 시도해 주세요.' : '신고하지 못했어요.'))
    },
    blockUser: (userId) => { server.block(userId).then(() => { setServerBlocked((items) => [...new Set([...items, userId])]); showToast('사용자를 차단했습니다.') }).catch(fail('차단하지 못했어요.')) },
    toggleBoardNotifications: (boardId) => {
      const muted = mutedBoardIds.includes(boardId)
      setMutedBoardIds((items) => muted ? items.filter((id) => id !== boardId) : [...items, boardId])
      server.setBoardAlert(boardId, muted).catch(() => { setMutedBoardIds((items) => muted ? [...items, boardId] : items.filter((id) => id !== boardId)); showToast('알림 설정을 바꾸지 못했어요.') })
    },
    updateNotificationSettings: (settings) => { updateNotificationSettings(settings); server.saveSettings(settings).catch(fail('알림 설정을 저장하지 못했어요.')) },
  }
  // 서버 연동이 켜지면(로그인 직후 · 로그인 상태로 앱 실행) 목업 데이터를 비우고 서버 데이터로 채운다
  useEffect(() => {
    if (!server.live) return
    setBoards([]); setComments([]); setNotices([])
    server.loadNearby()
    server.loadNotices().catch(() => undefined)
    server.loadSettings().catch(() => undefined)
    server.loadLevel().catch(() => undefined)
    server.loadBadges().catch(() => undefined)
    server.loadBlocks().then(setServerBlocked).catch(() => undefined)
  }, [server.live])
  // 알림 종 숫자: 화면이 보이는 동안 1분마다, 알림 화면을 열 때 목록과 함께 새로 받는다 (알림은 실시간 연결이 없다)
  useEffect(() => {
    if (!server.live) return
    const refresh = () => { if (document.visibilityState === 'visible') server.loadUnread().catch(() => undefined) }
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [server.live])
  useEffect(() => { if (server.live && screen === 'alerts') server.loadNotices().catch(() => undefined) }, [screen])
  // 앱 푸시 알림: 로그인 · 온보딩을 마치고 지도 · 게시판에 처음 들어왔을 때 권한을 묻고 이 기기 토큰을 등록한다 (앱에서만)
  const pushStarted = useRef(false)
  const latestServer = useRef(server)
  latestServer.current = server
  useEffect(() => {
    if (!server.live || pushStarted.current || (screen !== 'home' && screen !== 'board')) return
    pushStarted.current = true
    const refreshAlerts = () => { latestServer.current.loadUnread().catch(() => undefined); latestServer.current.loadNotices().catch(() => undefined) }
    startPush({
      onReceive: refreshAlerts,
      onOpen: ({ postId, toAlerts }) => navigate(toAlerts || !postId ? pathForScreen('alerts') : pathForScreen('detail', postId)),
    })
    // 웹(PWA): 알림 설정에서 켜 둔 기기면 토큰을 다시 맞춘다. 앱을 보고 있을 때 온 알림은 토스트로
    startWebPush({
      onReceive: (title) => { refreshAlerts(); if (title) showToast(title) },
      onOpen: (url) => navigate(url),
    })
  }, [server.live, screen])
  // 서버 연동 배포본: 로그인 없이 /map 같은 주소로 바로 들어오면 목업 데이터가 보이지 않게 로그인 화면으로 보낸다
  useEffect(() => {
    if (apiEnabled && !readSession() && screen !== 'login' && screen !== 'kakao-callback') navigate(pathForScreen('login'), { replace: true })
  }, [screen])
  // 토큰 갱신까지 실패하면(만료 · 다른 기기 로그아웃 · 탈퇴) 실시간을 끊고 로그인 화면으로
  useEffect(() => {
    const expired = () => {
      server.stopRealtime()
      setUser((value) => ({ ...value, serverId: undefined }))
      showToast('로그인이 만료됐어요. 다시 로그인해 주세요.')
      navigate(pathForScreen('login', currentBoardId), { replace: true })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired)
  })
  // 지도 · 게시판으로 돌아오면 주변 글을 다시 받는다
  useEffect(() => { if (server.live && (screen === 'home' || screen === 'board')) server.loadNearby() }, [screen])
  // 게시글 상세는 목록에서 열든 주소로 바로 들어오든(새로고침 포함) 상세 · 댓글 · 투표를 새로 받는다
  useEffect(() => {
    if (!server.live || (screen !== 'detail' && screen !== 'outside') || !currentBoardId) return
    server.loadBoard(currentBoardId).catch((error) => {
      // 삭제된 게시물: 목록에서도 빼고 상세는 '삭제된 게시물' 안내로
      if (error instanceof ApiError && error.status === 404) { setMissingBoardIds((ids) => new Set(ids).add(currentBoardId)); setBoards((items) => items.filter((board) => board.id !== currentBoardId)); return }
      showToast('게시글을 불러오지 못했어요.')
    })
    // 이 게시판 알림을 다른 기기에서 껐을 수도 있어 상세를 열 때 맞춘다
    server.getBoardAlert(currentBoardId).then((enabled) => setMutedBoardIds((items) => enabled ? items.filter((id) => id !== currentBoardId) : [...new Set([...items, currentBoardId])])).catch(() => undefined)
  }, [screen, currentBoardId, server.live])
  // 상세 화면을 보는 동안만 실시간 구독 (다른 사람의 댓글 · 반응 · 종료 · 삭제를 바로 반영)
  useEffect(() => {
    if (!server.live || screen !== 'detail' || !currentBoardId) return
    return server.watchBoard(currentBoardId)
  }, [screen, currentBoardId, server.live])
  const value = useMemo<AppContextValue>(() => ({
    screen, user, boards, comments, notices, reports, currentBoard: boards.find((board) => board.id === currentBoardId), currentBoardMissing: missingBoardIds.has(currentBoardId), inRange,
    blockedUsers: server.live ? serverBlocked : blockedUsers,
    alertBoardIds: server.live ? boards.filter((board) => !mutedBoardIds.includes(board.id)).map((board) => board.id) : alertBoardIds,
    recentBoardIds, notificationSettings, themeMode, setThemeMode, toggleTheme, locationPermission, toast,
    go, back, withBackTransition, openBoard, startLogin, finishKakaoLogin, agreeTerms, completeNickname, logout, withdraw, setLocationPermission, updateComment, setInRange, relocate,
    refreshBoard: (boardId) => server.live ? server.loadBoard(boardId).then(() => undefined) : Promise.resolve(),
    refreshNotices: () => server.live ? Promise.all([server.loadNotices(), server.loadUnread()]).then(() => undefined) : Promise.resolve(),
    createBoard, updateBoard, deleteBoard, finishBoard, reopenBoard, reactToBoard, addComment, deleteComment, markCommentRead, reactToComment, toggleCommentLike, startVote, castVote,
    updateUser, profileImageUrl: profileImage?.url ?? null, changeProfileImage, removeProfileImage, markNoticeRead, markAllNoticesRead, deleteNotice, reportTarget, blockUser, toggleBoardNotifications, updateNotificationSettings, resolveReport, showToast,
    live: server.live, boardsLoading: server.boardsLoading, boardsError: server.boardsError, reloadBoards: server.loadNearby, serverLevel: server.level, serverBadges: server.badges, serverUnread: server.unreadCount, loadRanking: server.loadRanking, findSimilar: server.findSimilar, searchArea: server.searchArea, loadActivity: server.loadActivity,
    ...liveActions,
  }), [screen, user, boards, comments, notices, reports, missingBoardIds, currentBoardId, inRange, blockedUsers, alertBoardIds, recentBoardIds, notificationSettings, themeMode, locationPermission, toast, mutedBoardIds, serverBlocked, server.live, server.boardsLoading, server.boardsError, server.level, server.badges, server.unreadCount, profileImage])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}
