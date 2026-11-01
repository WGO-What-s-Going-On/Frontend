import { useRef, useState } from 'react'
import { serverFeatures, WS_URL } from '../api/config'
import { readSession } from '../api/session'
import { currentCoords, toWorldPoint, type Coords } from '../api/geo'
import * as posts from '../api/posts'
import * as notifications from '../api/notifications'
import { createRealtime, type Realtime, type RealtimeEvent } from '../api/realtime'
import { blockUser as blockUserApi } from '../api/users'
import { uploadImage } from '../api/media'
import { timeAgo } from '../domain/time'
import type { LevelStats } from '../features/level/levels'
import type { Board, Category, Comment, CommentReaction, Notice, PostReaction, Reach, Report } from '../types/domain'
import type { NotificationSettings } from './AppContext'

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

interface Setters {
  setBoards: Setter<Board[]>
  setComments: Setter<Comment[]>
  setNotices: Setter<Notice[]>
  setNotificationSettings: Setter<NotificationSettings>
  // 보고 있던 게시글이 다른 곳에서 삭제됐을 때 (실시간)
  onBoardDeleted: (boardId: string) => void
}

export interface RankingView { regionName: string; items: { rank: number; name: string; picks: number; score: number; me: boolean }[]; myRank: number | null; myScore: number }

// 실제 서버 연동 (serverFeatures.posts가 켜져 있고 로그인했을 때만).
// 화면은 그대로 두고, 앱 상태(boards · comments · notices)를 서버 데이터로 채우고 사용자 동작을 서버로 보낸다.
export function useServerSync({ setBoards, setComments, setNotices, setNotificationSettings, onBoardDeleted }: Setters) {
  const live = serverFeatures.posts && Boolean(readSession())
  const coords = useRef<Coords | null>(null)
  const [boardsLoading, setBoardsLoading] = useState(false)
  const [boardsError, setBoardsError] = useState(false)
  const [level, setLevel] = useState<LevelStats | null>(null)
  const realtime = useRef<Realtime | null>(null)
  const reloadTimers = useRef(new Map<string, number>())
  const boardDeleted = useRef(onBoardDeleted)
  boardDeleted.current = onBoardDeleted

  // 내 글 · 댓글은 화면에서 작성자 비교에 쓰는 'me'로 바꿔 둔다 (목업과 같은 비교 코드를 그대로 쓰기 위해)
  const mine = (authorId: string) => authorId !== '' && authorId === readSession()?.userId ? 'me' : authorId
  const placeBoard = (post: posts.PostResponse): Board => {
    const board = posts.toBoard(post)
    return { ...board, authorId: mine(board.authorId), position: coords.current ? toWorldPoint(coords.current, post.locationSnapshot) : undefined }
  }
  const placeComment = (comment: posts.CommentResponse): Comment => { const mapped = posts.toComment(comment); return { ...mapped, authorId: mine(mapped.authorId) } }
  const upsertBoard = (board: Board) => setBoards((items) => items.some((item) => item.id === board.id) ? items.map((item) => item.id === board.id ? { ...item, ...board } : item) : [board, ...items])

  // 위치를 잡고 서버에 알린다 (게시판 참여 · 글쓰기 위치 인가는 서버가 최근 위치로 판단)
  const locate = async () => {
    const next = await currentCoords()
    coords.current = next
    posts.updateLocation(next).catch(() => undefined)
    return next
  }
  const ensureCoords = async () => coords.current ?? locate()

  // 주변 글 (지도 핀 · 게시판). 150m 밖 글도 읽기 전용으로 보이도록 가장 넓은 350m로 가져온다
  const loadNearby = async () => {
    setBoardsLoading(true)
    setBoardsError(false)
    try {
      const here = await locate()
      const result = await posts.getNearbyPosts({ ...here, radiusM: 350, sort: 'distance', limit: 100 })
      setBoards(result.posts.map(placeBoard))
    } catch { setBoardsError(true) } finally { setBoardsLoading(false) }
  }

  // 게시글 하나: 상세 · 댓글 · 투표를 함께 새로 받는다
  const loadBoard = async (postId: string) => {
    const [post, comments, vote] = await Promise.all([
      posts.getPost(postId, coords.current ?? undefined),
      posts.getComments(postId),
      posts.getVote(postId).catch(() => null),
    ])
    const board = { ...placeBoard(post), ...posts.toBoardVote(vote) }
    upsertBoard(board)
    setComments((items) => [...items.filter((item) => item.boardId !== postId), ...comments.comments.filter((comment) => comment.status === 'ACTIVE').map(placeComment)])
    return board
  }

  const createPost = async (input: { category: Category; title: string; body: string; anonymous?: boolean; reach?: Reach; imageFile?: File }) => {
    // 사진을 먼저 올려 mediaId를 받는다 (실패하면 글도 올리지 않는다)
    const mediaIds = input.imageFile ? [await uploadImage(input.imageFile)] : undefined
    const here = await locate()
    const post = await posts.createPost({ title: input.title, content: input.body, category: input.category, latitude: here.latitude, longitude: here.longitude, radiusM: input.reach ?? 150, anonymous: input.anonymous, mediaIds })
    // 생성 응답에는 작성자 닉네임 · 반응 수 · 사진이 없어 상세를 다시 받아 채운다
    const board = await loadBoard(post.postId)
    return board.id
  }

  // 비슷한 글 팝업에 넣을 모양으로 (서버는 제목 · 요약 · 거리 · 시각만 준다)
  const findSimilar = async (draft: { category: Category; title: string; body: string; reach?: Reach }): Promise<Board[]> => {
    const here = await ensureCoords()
    const result = await posts.findSimilarPosts({ title: draft.title, content: draft.body, category: draft.category, latitude: here.latitude, longitude: here.longitude, radiusM: draft.reach ?? 150 })
    return result.items.map((item) => ({
      id: item.postId, authorId: '', authorName: '', category: posts.categoryFromCode(item.category), title: item.title, body: item.excerpt,
      distance: Math.round(item.distanceM), createdAt: timeAgo(item.createdAt), status: '실시간', views: 0,
      reactions: { '저도 궁금해요': 0, '지금도 그래요': 0, '도움 됐어요': 0, '이제 끝났어요': 0 },
    }))
  }

  // 반응은 하나만: 같은 걸 누르면 취소, 다른 걸 누르면 기존 것을 지우고 새로 단다
  const reactToPost = async (postId: string, reaction: PostReaction, current?: PostReaction) => {
    if (current) await posts.cancelPostReaction(postId, current)
    if (current !== reaction) await posts.reactToPost(postId, reaction)
    await loadBoard(postId)
  }
  const reactToComment = async (postId: string, commentId: string, reaction: CommentReaction, current?: CommentReaction) => {
    if (current) await posts.cancelCommentReaction(postId, commentId, current)
    if (current !== reaction) await posts.reactToComment(postId, commentId, reaction)
    await loadBoard(postId)
  }
  // 댓글은 게시판 참여자만 쓸 수 있어 먼저 참여한다 (재참여는 서버가 그대로 받아 준다)
  const addComment = async (postId: string, body: string, parentId?: string, imageFile?: File) => {
    const mediaIds = imageFile ? [await uploadImage(imageFile)] : undefined
    await locate()
    await posts.joinPost(postId)
    await posts.createComment(postId, body, parentId, mediaIds)
    await loadBoard(postId)
  }
  const deleteComment = async (postId: string, commentId: string) => { await posts.deleteComment(postId, commentId); await loadBoard(postId) }
  // 한 사람 한 표: 내 후보를 다시 누르면 취소
  const castVote = async (postId: string, commentId: string, current?: string) => {
    const vote = current === commentId ? (await posts.cancelVote(postId), await posts.getVote(postId)) : await posts.castVote(postId, commentId)
    setBoards((items) => items.map((board) => board.id === postId ? { ...board, ...posts.toBoardVote(vote) } : board))
  }
  const editPost = async (postId: string, title: string, body: string) => { await posts.editPost(postId, { title, content: body }); await loadBoard(postId) }
  const setClosed = async (postId: string, closed: boolean) => { await posts.setPostClosed(postId, closed); await loadBoard(postId) }
  const deletePost = async (postId: string) => {
    // 내 삭제 이벤트로 '삭제됐어요' 안내가 뜨지 않게 먼저 구독을 끊는다
    realtime.current?.leave(postId)
    await posts.deletePost(postId)
    setBoards((items) => items.filter((board) => board.id !== postId))
  }
  const report = (targetType: Report['targetType'], targetId: string, reason: string) => posts.reportTarget(targetType === '게시글' ? 'POST' : 'COMMENT', targetId, reason)
  const block = (userId: string) => blockUserApi(userId)

  // 알림 목록 · 설정
  const loadNotices = async () => {
    const result = await notifications.getNotifications()
    setNotices(result.items.map((item) => ({
      id: item.notificationId, text: item.body ? `${item.title} ${item.body}` : item.title, createdAt: timeAgo(item.createdAt), read: item.isRead,
      type: /COMMENT|REPLY/.test(item.type) ? 'reply' : /REACTION/.test(item.type) ? 'reaction' : /CLOSE|EXPIRE/.test(item.type) ? 'lifecycle' : 'nearby',
      boardId: item.targetType === 'COMMENT' ? undefined : item.targetId ?? undefined,
    })))
  }
  const loadSettings = async () => { setNotificationSettings(await notifications.getNotificationSettings()) }
  const saveSettings = (settings: NotificationSettings) => notifications.updateNotificationSettings(settings)
  const readNotice = (id: string) => notifications.markNotificationRead(id)
  const readAllNotices = () => notifications.markAllNotificationsRead()
  const removeNotice = (id: string) => notifications.deleteNotification(id)
  const setBoardAlert = (postId: string, enabled: boolean) => notifications.setBoardNotification(postId, enabled)

  // 활동: 칭호 점수, 내 행정동 랭킹
  const loadLevel = async () => { const result = await posts.getMyLevel(); setLevel({ participation: result.participation, agreeReceived: result.agreeReceived, picks: result.picks }) }
  const loadRanking = async (): Promise<RankingView> => {
    const region = await posts.getMyRegion(await ensureCoords())
    const ranking = await posts.getRanking(region.code)
    const myId = Number(readSession()?.userId)
    return {
      regionName: region.name, myRank: ranking.myRank, myScore: ranking.myScore,
      items: ranking.items.map((item) => ({ rank: item.rank, name: item.authorNickname ?? '알 수 없음', picks: item.picks, score: item.score, me: item.userId === myId })),
    }
  }

  // 실시간: 같은 게시글 이벤트가 몰려도 상세 · 댓글 · 투표는 잠깐 모아서 한 번만 다시 읽는다
  const scheduleReload = (postId: string) => {
    window.clearTimeout(reloadTimers.current.get(postId))
    reloadTimers.current.set(postId, window.setTimeout(() => { reloadTimers.current.delete(postId); loadBoard(postId).catch(() => undefined) }, 250))
  }
  const onRealtimeEvent = (event: RealtimeEvent) => {
    const postId = event.boardId ?? event.postId
    if (!postId) return
    if (event.type === 'post.deleted') {
      setBoards((items) => items.filter((board) => board.id !== postId))
      setComments((items) => items.filter((comment) => comment.boardId !== postId))
      boardDeleted.current(postId)
      return
    }
    if (event.type === 'comment.deleted') {
      const commentId = (event.comment as { commentId?: string } | undefined)?.commentId
      if (commentId) setComments((items) => items.filter((comment) => comment.id !== commentId))
    }
    scheduleReload(postId)
  }
  // 상세 화면을 보는 동안만 그 게시판에 실시간 참여한다. 참여는 서버가 최근 위치(5분)로 판단해서 위치를 먼저 알린다
  const watchBoard = (postId: string) => {
    if (!live || !WS_URL) return () => undefined
    realtime.current ??= createRealtime({ url: WS_URL, onEvent: (event) => onRealtimeEvent(event), onRejoin: scheduleReload })
    const client = realtime.current
    let active = true
    locate().catch(() => undefined).then(() => { if (active) return client.join(postId) }).catch(() => undefined)
    return () => { active = false; client.leave(postId) }
  }
  const stopRealtime = () => { realtime.current?.dispose(); realtime.current = null }

  return {
    live, boardsLoading, boardsError, level,
    locate, loadNearby, loadBoard, createPost, findSimilar, reactToPost, reactToComment, addComment, deleteComment, castVote,
    editPost, setClosed, deletePost, report, block, loadNotices, loadSettings, saveSettings, readNotice, readAllNotices, removeNotice, setBoardAlert,
    loadLevel, loadRanking, watchBoard, stopRealtime,
  }
}
