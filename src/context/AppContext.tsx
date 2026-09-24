import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { initialBoards, initialComments, initialNotices, initialUser } from '../data/mockData'
import { boardIdFromPath, pathForScreen, screenFromPath } from '../navigation'
import type { Board, Category, Comment, CommentReaction, Notice, PostReaction, Report, Screen, User } from '../types/domain'

interface BoardInput { category: Category; title: string; body: string; imageName?: string }
interface NotificationSettings { nearby: boolean; replies: boolean }

interface PersistedMockState {
  user: User
  boards: Board[]
  comments: Comment[]
  notices: Notice[]
  reports: Report[]
  currentBoardId: string
  inRange: boolean
  blockedUsers: string[]
  mutedBoardIds: string[]
  recentBoardIds: string[]
  notificationSettings: NotificationSettings
}

const STORAGE_KEY = 'wgo-mockup-state-v2'

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
  mutedBoardIds: string[]
  recentBoardIds: string[]
  notificationSettings: NotificationSettings
  toast: string
  go: (screen: Screen) => void
  back: (fallback?: Screen) => void
  openBoard: (id: string, commentId?: string) => void
  setInRange: (value: boolean) => void
  createBoard: (input: BoardInput) => void
  updateBoard: (id: string, input: Pick<BoardInput, 'title' | 'body' | 'category'>) => void
  deleteBoard: (id: string) => void
  finishBoard: (id: string) => void
  reactToBoard: (id: string, reaction: PostReaction) => void
  addComment: (body: string, parentId?: string, imageUrl?: string) => void
  deleteComment: (id: string) => void
  markCommentRead: (id: string) => void
  markCommentsRead: (ids: string[]) => void
  reactToComment: (id: string, reaction: CommentReaction) => void
  updateUser: (input: Pick<User, 'nickname' | 'bio'>) => void
  markNoticeRead: (id: string) => void
  markAllNoticesRead: () => void
  reportTarget: (targetType: Report['targetType'], targetId: string, reason: string) => void
  blockUser: (userId: string) => void
  unblockUser: (userId: string) => void
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
  const [boards, setBoards] = useState(persisted.boards ?? initialBoards)
  const [comments, setComments] = useState(persisted.comments ?? initialComments)
  const [notices, setNotices] = useState(persisted.notices ?? initialNotices)
  const [reports, setReports] = useState<Report[]>(persisted.reports ?? [])
  const [storedBoardId, setCurrentBoardId] = useState(persisted.currentBoardId ?? 'fire')
  const currentBoardId = boardIdFromPath(location.pathname) ?? storedBoardId
  const [inRange, setInRange] = useState(persisted.inRange ?? true)
  const [blockedUsers, setBlockedUsers] = useState<string[]>(persisted.blockedUsers ?? [])
  const [mutedBoardIds, setMutedBoardIds] = useState<string[]>(persisted.mutedBoardIds ?? [])
  const [recentBoardIds, setRecentBoardIds] = useState<string[]>(persisted.recentBoardIds ?? [])
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(persisted.notificationSettings ?? { nearby: true, replies: true })
  const [toast, setToast] = useState('')

  useEffect(() => {
    const state: PersistedMockState = { user, boards, comments, notices, reports, currentBoardId, inRange, blockedUsers, mutedBoardIds, recentBoardIds, notificationSettings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [user, boards, comments, notices, reports, currentBoardId, inRange, blockedUsers, mutedBoardIds, recentBoardIds, notificationSettings])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }
  const go = (next: Screen) => navigate(pathForScreen(next, currentBoardId))
  const back = (fallback: Screen = 'board') => location.key === 'default' ? go(fallback) : navigate(-1)
  // 알림에서 들어올 때 어느 댓글 때문에 왔는지 함께 넘긴다. 목적지가 글 맨 위가 아니라 그 댓글이 되도록.
  const openBoard = (id: string, commentId?: string) => {
    setCurrentBoardId(id)
    setRecentBoardIds((items) => [id, ...items.filter((item) => item !== id)])
    navigate(`${pathForScreen('detail', id)}${commentId ? `?comment=${encodeURIComponent(commentId)}` : ''}`)
  }
  const createBoard = (input: BoardInput) => {
    const id = `board-${Date.now()}`
    setBoards((items) => [{
      id, authorId: user.id, authorName: user.nickname, distance: 0, createdAt: '방금 전', status: '실시간', views: 1,
      reactions: { '저도 궁금해요': 0, '지금도 그래요': 0, '도움 됐어요': 0, '이제 끝났어요': 0 }, ...input,
    }, ...items])
    setCurrentBoardId(id)
    showToast('게시판이 생성되었습니다.')
    navigate(pathForScreen('detail', id))
  }
  const updateBoard = (id: string, input: Pick<BoardInput, 'title' | 'body' | 'category'>) => {
    setBoards((items) => items.map((board) => board.id === id ? { ...board, ...input } : board))
    showToast('게시글을 수정했습니다.')
    go('detail')
  }
  const deleteBoard = (id: string) => { setBoards((items) => items.filter((board) => board.id !== id)); showToast('게시글을 삭제했습니다.'); go('board') }
  const finishBoard = (id: string) => { setBoards((items) => items.map((board) => board.id === id ? { ...board, status: '종료됨' } : board)); showToast('게시판을 종료했습니다.') }
  const reactToBoard = (id: string, reaction: PostReaction) => setBoards((items) => items.map((board) => {
    if (board.id !== id) return board
    const previous = board.reactedByMe
    const reactions = { ...board.reactions }
    if (previous) reactions[previous] -= 1
    if (previous !== reaction) reactions[reaction] += 1
    return { ...board, reactions, reactedByMe: previous === reaction ? undefined : reaction }
  }))
  const addComment = (body: string, parentId?: string, imageUrl?: string) => {
    setComments((items) => [...items, { id: `comment-${Date.now()}`, boardId: currentBoardId, authorId: user.id, authorName: user.nickname, body, imageUrl, read: true, createdAt: '방금 전', verified: inRange, parentId, reactions: { '도움돼요': 0, '맞아요': 0, '정보가 달라요': 0 } }])
    showToast(parentId ? '답글을 등록했습니다.' : '댓글을 등록했습니다.')
  }
  const deleteComment = (id: string) => setComments((items) => items.filter((comment) => comment.id !== id))
  const markCommentRead = (id: string) => setComments((items) => items.map((comment) => comment.id === id ? { ...comment, read: true } : comment))
  // 바뀔 것이 없으면 같은 배열을 그대로 돌려준다. 새 배열을 만들면 컨텍스트가 갱신되며 호출부의 effect가 다시 돌아 무한 루프가 된다.
  const markCommentsRead = (ids: string[]) => setComments((items) => items.some((comment) => ids.includes(comment.id) && !comment.read)
    ? items.map((comment) => ids.includes(comment.id) ? { ...comment, read: true } : comment)
    : items)
  const reactToComment = (id: string, reaction: CommentReaction) => setComments((items) => items.map((comment) => {
    if (comment.id !== id) return comment
    const previous = comment.reactedByMe
    const reactions = { ...comment.reactions }
    if (previous) reactions[previous] -= 1
    if (previous !== reaction) reactions[reaction] += 1
    return { ...comment, reactions, reactedByMe: previous === reaction ? undefined : reaction }
  }))
  const updateUser = (input: Pick<User, 'nickname' | 'bio'>) => { setUser((value) => ({ ...value, ...input })); showToast('프로필을 저장했습니다.'); go('my') }
  const markNoticeRead = (id: string) => setNotices((items) => items.map((notice) => notice.id === id ? { ...notice, read: true } : notice))
  const markAllNoticesRead = () => setNotices((items) => items.map((notice) => ({ ...notice, read: true })))
  const reportTarget = (targetType: Report['targetType'], targetId: string, reason: string) => { setReports((items) => [...items, { id: `report-${Date.now()}`, targetType, targetId, reason, status: '접수' }]); showToast('신고가 접수되었습니다.') }
  const blockUser = (userId: string) => { setBlockedUsers((items) => [...new Set([...items, userId])]); showToast('사용자를 차단했습니다.') }
  const unblockUser = (userId: string) => { setBlockedUsers((items) => items.filter((id) => id !== userId)); showToast('차단을 해제했습니다.') }
  const toggleBoardNotifications = (boardId: string) => setMutedBoardIds((items) => items.includes(boardId) ? items.filter((id) => id !== boardId) : [...items, boardId])
  const updateNotificationSettings = (settings: NotificationSettings) => setNotificationSettings(settings)
  const resolveReport = (id: string, hideTarget: boolean) => {
    const report = reports.find((item) => item.id === id)
    if (hideTarget && report?.targetType === '게시글') setBoards((items) => items.map((board) => board.id === report.targetId ? { ...board, status: '숨김' } : board))
    if (hideTarget && report?.targetType === '댓글') setComments((items) => items.filter((comment) => comment.id !== report.targetId))
    setReports((items) => items.map((item) => item.id === id ? { ...item, status: '처리 완료' } : item))
  }
  const value = useMemo<AppContextValue>(() => ({
    screen, user, boards, comments, notices, reports, currentBoard: boards.find((board) => board.id === currentBoardId), inRange, blockedUsers, mutedBoardIds, recentBoardIds, notificationSettings, toast,
    go, back, openBoard, setInRange, createBoard, updateBoard, deleteBoard, finishBoard, reactToBoard, addComment, deleteComment, markCommentRead, markCommentsRead, reactToComment,
    updateUser, markNoticeRead, markAllNoticesRead, reportTarget, blockUser, unblockUser, toggleBoardNotifications, updateNotificationSettings, resolveReport, showToast,
  }), [screen, user, boards, comments, notices, reports, currentBoardId, inRange, blockedUsers, mutedBoardIds, recentBoardIds, notificationSettings, toast])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}
