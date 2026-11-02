import { useRef, useState } from 'react'
import { serverFeatures, WS_URL } from '../api/config'
import { readSession } from '../api/session'
import { currentCoords, distanceMeters, fromWorldPoint, toWorldPoint, type Coords } from '../api/geo'
import type { Point } from '../features/map/mapWorld'
import * as posts from '../api/posts'
import * as notifications from '../api/notifications'
import { createRealtime, type Realtime, type RealtimeEvent } from '../api/realtime'
import { blockUser as blockUserApi, getBlocks, getMyBadges } from '../api/users'
import { uploadImage } from '../api/media'
import { timeAgo } from '../domain/time'
import type { LevelStats } from '../features/level/levels'
import type { Board, Category, Comment, CommentReaction, Notice, PostReaction, Reach } from '../types/domain'
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
  // 서버가 준 뱃지 이름 (뱃지 획득 여부는 서버 기준)
  const [badges, setBadges] = useState<string[] | null>(null)
  // 안 읽은 알림 수 (목록은 20개씩이라 서버 집계를 따로 받는다)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const realtime = useRef<Realtime | null>(null)
  // 상세를 연 게시글: 주변 목록을 새로 받아도 목록 밖이면 남겨 둔다 (멀리 있는 글 상세 · 투표 정보가 사라지지 않게)
  const opened = useRef(new Set<string>())
  const reloadTimers = useRef(new Map<string, number>())
  const boardDeleted = useRef(onBoardDeleted)
  boardDeleted.current = onBoardDeleted

  // 내 글 · 댓글은 화면에서 작성자 비교에 쓰는 'me'로 바꿔 둔다 (목업과 같은 비교 코드를 그대로 쓰기 위해)
  const mine = (authorId: string) => authorId !== '' && authorId === readSession()?.userId ? 'me' : authorId
  const placeBoard = (post: posts.PostResponse): Board => {
    const board = posts.toBoard(post)
    return { ...board, authorId: mine(board.authorId), location: post.locationSnapshot, position: coords.current ? toWorldPoint(coords.current, post.locationSnapshot) : undefined }
  }
  const placeComment = (comment: posts.CommentResponse): Comment => { const mapped = posts.toComment(comment); return { ...mapped, authorId: mine(mapped.authorId) } }
  // 목록 · 활동 · 지역 조회 응답에는 투표 정보가 없어 상세에서 받아 둔 값을 이어 붙인다
  const keepVote = (items: Board[], board: Board) => { const old = items.find((item) => item.id === board.id); return old ? { ...board, vote: old.vote, voteStatus: old.voteStatus } : board }
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
      const fresh = result.posts.map(placeBoard)
      const freshIds = new Set(fresh.map((board) => board.id))
      // 목록 응답에는 투표 정보가 없어서, 상세에서 받아 둔 투표 상태는 그대로 이어 붙인다
      setBoards((items) => [
        ...fresh.map((board) => keepVote(items, board)),
        ...items.filter((item) => !freshIds.has(item.id) && opened.current.has(item.id)),
      ])
    } catch { setBoardsError(true) } finally { setBoardsLoading(false) }
  }

  // 지도를 옮긴 곳 주변 글 (이 지역에서 다시 찾기). 서버 거리는 지도 가운데 기준이라 내 위치 기준으로 다시 잰다 (150m 참여 판단용)
  const searchArea = async (center: Point) => {
    const here = await ensureCoords()
    const target = fromWorldPoint(here, center)
    const result = await posts.getNearbyPosts({ ...target, radiusM: 350, sort: 'distance', limit: 100 })
    const found = result.posts.map((post) => ({ ...placeBoard(post), distance: Math.round(distanceMeters(here, post.locationSnapshot)) }))
    setBoards((items) => [...items.filter((item) => !found.some((board) => board.id === item.id)), ...found.map((board) => keepVote(items, board))])
    return found.length
  }

  // 게시글 하나: 상세 · 댓글 · 투표를 함께 새로 받는다
  const loadBoard = async (postId: string) => {
    opened.current.add(postId)
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
    opened.current.delete(postId)
    setBoards((items) => items.filter((board) => board.id !== postId))
  }
  const report = (target: { postId: string; commentId?: string }, reason: string) => posts.reportTarget(target, reason)
  const editComment = async (postId: string, commentId: string, body: string) => { await posts.editComment(postId, commentId, body); await loadBoard(postId) }
  // 차단 목록 (프론트가 이 사람들의 글 · 댓글을 숨긴다). 여러 페이지면 끝까지
  const loadBlocks = async () => {
    const ids: string[] = []
    let cursor: string | undefined
    do { const page = await getBlocks(cursor); ids.push(...page.items.map((item) => item.userId)); cursor = page.nextCursor ?? undefined } while (cursor)
    return ids
  }
  const getBoardAlert = (postId: string) => notifications.getBoardNotification(postId).then((result) => result.enabled)
  const block = (userId: string) => blockUserApi(userId)

  // 알림 목록 · 설정
  const loadNotices = async () => {
    const result = await notifications.getNotifications()
    setNotices(result.items.map((item) => ({
      id: item.notificationId, text: item.body ? `${item.title} ${item.body}` : item.title, createdAt: timeAgo(item.createdAt), read: item.isRead,
      type: /COMMENT|REPLY/.test(item.type) ? 'reply' : /REACTION/.test(item.type) ? 'reaction' : /CLOSE|EXPIRE/.test(item.type) ? 'lifecycle' : 'nearby',
      // 알림의 targetId는 댓글 알림이어도 게시글 ID다 (Notification 서비스 기준)
      boardId: item.targetId ?? undefined,
    })))
  }
  const loadUnread = async () => { setUnreadCount((await notifications.getUnreadCount()).count) }
  const loadSettings = async () => { setNotificationSettings(await notifications.getNotificationSettings()) }
  const saveSettings = (settings: NotificationSettings) => notifications.updateNotificationSettings(settings)
  const readNotice = (id: string) => notifications.markNotificationRead(id)
  const readAllNotices = () => notifications.markAllNotificationsRead()
  const removeNotice = (id: string) => notifications.deleteNotification(id)
  const setBoardAlert = (postId: string, enabled: boolean) => notifications.setBoardNotification(postId, enabled)

  // 최근 활동: 서버 기록(작성 · 댓글 · 반응)으로 게시판을 모은다. 주변 목록에 없는 글(멀리 있거나 종료된 글)은 하나씩 받아 채운다
  const loadActivity = async () => {
    const items: posts.ActivityItem[] = []
    let cursor: string | undefined
    for (let page = 0; page < 3; page++) {
      const result = await posts.getMyActivity(cursor)
      items.push(...result.items)
      if (!result.nextCursor) break
      cursor = result.nextCursor
    }
    const ids = (kinds: posts.ActivityItem['kind'][]) => new Set(items.filter((item) => kinds.includes(item.kind)).map((item) => item.postId))
    const activity = { written: ids(['POST']), commented: ids(['COMMENT']), reacted: ids(['REACTION', 'COMMENT_REACTION']) }
    const all = [...new Set(items.map((item) => item.postId))].slice(0, 30)
    const fetched = await Promise.all(all.map((postId) => posts.getPost(postId, coords.current ?? undefined).then(placeBoard).catch(() => null)))
    const found = fetched.filter((board): board is Board => board !== null)
    setBoards((list) => [...list.filter((item) => !found.some((board) => board.id === item.id)), ...found.map((board) => keepVote(list, board))])
    return { written: [...activity.written], commented: [...activity.commented], reacted: [...activity.reacted] }
  }

  // 활동: 칭호 점수, 내 행정동 랭킹
  const loadBadges = async () => { setBadges((await getMyBadges()).map((badge) => badge.name)) }
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
      opened.current.delete(postId)
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
    live, boardsLoading, boardsError, level, badges, unreadCount, loadUnread,
    locate, loadNearby, searchArea, loadBoard, createPost, findSimilar, reactToPost, reactToComment, addComment, deleteComment, castVote,
    editPost, setClosed, deletePost, report, editComment, loadBlocks, getBoardAlert, block, loadNotices, loadSettings, saveSettings, readNotice, readAllNotices, removeNotice, setBoardAlert,
    loadLevel, loadBadges, loadActivity, loadRanking, watchBoard, stopRealtime,
  }
}
