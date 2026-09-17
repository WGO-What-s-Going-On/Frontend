import { createContext, useContext, useMemo, useState } from 'react'
import { initialBoards, initialComments, initialNotices, initialUser } from '../data/mockData'
import type { Board, Category, Comment, CommentReaction, Notice, PostReaction, Report, Screen, User } from '../types/domain'

interface BoardInput { category: Category; title: string; body: string; hasPoll: boolean; imageName?: string }

interface AppContextValue {
  screen: Screen
  user: User
  boards: Board[]
  comments: Comment[]
  notices: Notice[]
  reports: Report[]
  currentBoard?: Board
  detailOrigin: Screen
  inRange: boolean
  blockedUsers: string[]
  toast: string
  go: (screen: Screen) => void
  openBoard: (id: string) => void
  setInRange: (value: boolean) => void
  createBoard: (input: BoardInput) => void
  updateBoard: (id: string, input: Pick<BoardInput, 'title' | 'body' | 'category'>) => void
  deleteBoard: (id: string) => void
  finishBoard: (id: string) => void
  reactToBoard: (id: string, reaction: PostReaction) => void
  addComment: (body: string, parentId?: string) => void
  deleteComment: (id: string) => void
  reactToComment: (id: string, reaction: CommentReaction) => void
  updateUser: (input: Pick<User, 'nickname' | 'bio'>) => void
  markNoticeRead: (id: string) => void
  markAllNoticesRead: () => void
  reportTarget: (targetType: Report['targetType'], targetId: string, reason: string) => void
  blockUser: (userId: string) => void
  resolveReport: (id: string, hideTarget: boolean) => void
  showToast: (message: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState(initialUser)
  const [boards, setBoards] = useState(initialBoards)
  const [comments, setComments] = useState(initialComments)
  const [notices, setNotices] = useState(initialNotices)
  const [reports, setReports] = useState<Report[]>([])
  const [currentBoardId, setCurrentBoardId] = useState('fire')
  const [detailOrigin, setDetailOrigin] = useState<Screen>('board')
  const [inRange, setInRange] = useState(true)
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [toast, setToast] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }
  const go = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openBoard = (id: string) => { setCurrentBoardId(id); setDetailOrigin(screen); go(inRange ? 'detail' : 'outside') }
  const createBoard = (input: BoardInput) => {
    const id = `board-${Date.now()}`
    setBoards((items) => [{
      id, authorId: user.id, authorName: user.nickname, distance: 0, createdAt: '방금 전', status: '실시간', views: 1,
      reactions: { '저도 궁금해요': 0, '지금도 그래요': 0, '도움 됐어요': 0, '이제 끝났어요': 0 }, ...input,
    }, ...items])
    setCurrentBoardId(id)
    showToast('게시판이 생성되었습니다.')
    go('detail')
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
  const addComment = (body: string, parentId?: string) => {
    setComments((items) => [...items, { id: `comment-${Date.now()}`, boardId: currentBoardId, authorId: user.id, authorName: user.nickname, body, createdAt: '방금 전', verified: inRange, parentId, reactions: { '도움돼요': 0, '맞아요': 0, '정보가 달라요': 0 } }])
    showToast(parentId ? '답글을 등록했습니다.' : '댓글을 등록했습니다.')
  }
  const deleteComment = (id: string) => setComments((items) => items.filter((comment) => comment.id !== id))
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
  const resolveReport = (id: string, hideTarget: boolean) => {
    const report = reports.find((item) => item.id === id)
    if (hideTarget && report?.targetType === '게시글') setBoards((items) => items.map((board) => board.id === report.targetId ? { ...board, status: '숨김' } : board))
    if (hideTarget && report?.targetType === '댓글') setComments((items) => items.filter((comment) => comment.id !== report.targetId))
    setReports((items) => items.map((item) => item.id === id ? { ...item, status: '처리 완료' } : item))
  }
  const value = useMemo<AppContextValue>(() => ({
    screen, user, boards, comments, notices, reports, currentBoard: boards.find((board) => board.id === currentBoardId), detailOrigin, inRange, blockedUsers, toast,
    go, openBoard, setInRange, createBoard, updateBoard, deleteBoard, finishBoard, reactToBoard, addComment, deleteComment, reactToComment,
    updateUser, markNoticeRead, markAllNoticesRead, reportTarget, blockUser, resolveReport, showToast,
  }), [screen, user, boards, comments, notices, reports, currentBoardId, detailOrigin, inRange, blockedUsers, toast])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}
