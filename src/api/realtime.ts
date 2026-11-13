import { api } from './client'

// 게시판 실시간 연결 (WebSocket). HTTP와 규칙이 달라 따로 둔다 (Backend gateways/ws-gateway/README.md)
// - 주소는 HTTP와 다른 호스트(VITE_WS_URL). 브라우저는 WebSocket에 헤더를 못 붙인다
// - 인증: 접속 직전 HTTP로 일회용 티켓(45초, 한 번만)을 받아 ?ticket=으로 붙인다. 다른 도메인 쿠키를 막는 Safari · 앱에서도 된다.
//   티켓을 못 받으면(구버전 서버 등) 예전처럼 로그인 쿠키로 접속한다. 재연결마다 새 티켓
// - 서버가 connection.ready를 보낸 뒤에만 명령을 보낸다. 명령은 {version:1, type, requestId, payload}
// - 같은 eventId는 한 번만 반영한다. 끊기면 지수 backoff로 다시 붙고, 다시 참여한 게시판은 HTTP로 새로 읽어 누락분을 채운다

export interface RealtimeEvent {
  version: number
  type: string
  eventId?: string
  postId?: string
  boardId?: string
  [field: string]: unknown
}

export class RealtimeError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

// 일회용 티켓 발급 (Authorization 헤더 필요, 응답은 저장 · 기록하지 않는다)
export const requestRealtimeTicket = () => api<{ ticket: string; expiresAt: string }>('POST', '/api/v1/realtime/tickets').then((result) => result.ticket)

interface Options {
  url: string
  // 접속 직전 티켓 받기. 없거나 실패하면 쿠키 인증으로 접속
  ticket?: () => Promise<string>
  // 테스트(Node)에서 Authorization 헤더를 붙일 때만 바꾼다. 브라우저는 기본값(쿠키 인증)
  open?: (url: string) => WebSocket
  onEvent: (event: RealtimeEvent) => void
  // 끊겼다 다시 참여한 게시판: 그 사이 놓친 댓글 · 반응을 HTTP로 다시 읽는다
  onRejoin: (boardId: string) => void
}

const COMMAND_TIMEOUT = 10_000
const MAX_DELAY = 30_000
// 한 번도 연결되지 못하고 연속으로 끊기면(쿠키 없음 · origin 차단 등) 멈추고, 다음 참여 때 다시 시도한다
const MAX_FAILED_OPENS = 3
const SEEN_LIMIT = 500

export function createRealtime({ url, ticket, open = (address) => new WebSocket(address), onEvent, onRejoin }: Options) {
  let socket: WebSocket | null = null
  // 티켓을 받는 중 (그 사이 접속을 겹쳐 시작하지 않게)
  let connecting = false
  let ready = false
  let attempt = 0
  let failedOpens = 0
  let retryTimer: number | undefined
  let sequence = 0
  // 참여하려는 게시판. 재연결 때 다시 참여한다
  const boards = new Set<string>()
  // 한 번이라도 참여에 성공한 게시판 (재연결 후 참여면 onRejoin)
  const joinedOnce = new Set<string>()
  // 지금 연결에서 참여가 끝난 게시판 (끊기면 비운다). 참여 전 · 실패면 화면이 HTTP로 대신 새로 읽는다
  const joined = new Set<string>()
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: RealtimeError) => void; timer: number }>()
  const seen = new Set<string>()

  const send = (type: string, payload: Record<string, unknown>) => new Promise<unknown>((resolve, reject) => {
    if (!socket || !ready) { reject(new RealtimeError('WS_NOT_READY', '실시간 연결 전')); return }
    const requestId = `r${++sequence}-${Date.now().toString(36)}`
    const timer = window.setTimeout(() => { pending.delete(requestId); reject(new RealtimeError('WS_TIMEOUT', `${type} 응답 없음`)) }, COMMAND_TIMEOUT)
    pending.set(requestId, { resolve, reject, timer })
    socket.send(JSON.stringify({ version: 1, type, requestId, payload }))
  })

  const joinOnServer = (boardId: string) => send('board.join', { boardId })
    .then(() => {
      if (joinedOnce.has(boardId)) onRejoin(boardId)
      joinedOnce.add(boardId)
      joined.add(boardId)
    })
    .catch((error: RealtimeError) => {
      // 150m 밖 · 위치 만료 · 종료된 글은 실시간 없이 HTTP 화면만 쓴다
      if (error.code === 'WS_BOARD_JOIN_FORBIDDEN') boards.delete(boardId)
      throw error
    })

  const handle = (message: RealtimeEvent & { requestId?: string; result?: unknown; code?: string; message?: string }) => {
    if (message.type === 'connection.ready') {
      ready = true
      attempt = 0
      failedOpens = 0
      boards.forEach((boardId) => joinOnServer(boardId).catch(() => undefined))
      return
    }
    if (message.type === 'command.ack' || message.type === 'command.result' || message.type === 'command.error') {
      const request = message.requestId ? pending.get(message.requestId) : undefined
      if (!request) return
      pending.delete(message.requestId!)
      window.clearTimeout(request.timer)
      if (message.type === 'command.error') request.reject(new RealtimeError(message.code ?? 'WS_COMMAND_ERROR', String(message.message ?? '')))
      else request.resolve(message.result)
      return
    }
    if (message.eventId) {
      if (seen.has(message.eventId)) return
      seen.add(message.eventId)
      if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!)
    }
    const boardId = message.boardId ?? message.postId
    if (!boardId || !boards.has(boardId)) return
    // 삭제 · 만료되면 서버가 방을 닫는다: 다시 참여하지 않는다
    if (message.type === 'post.deleted' || message.type === 'post.expired') { boards.delete(boardId); joinedOnce.delete(boardId) }
    onEvent(message)
  }

  const connect = () => {
    window.clearTimeout(retryTimer)
    if (socket || connecting || !boards.size) return
    if (!ticket) { openSocket(url); return }
    connecting = true
    ticket()
      .then((value) => `${url}${url.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(value)}`)
      .catch(() => url)
      .then((address) => {
        connecting = false
        // 티켓을 받는 동안 모든 게시판에서 나갔으면 접속하지 않는다
        if (!socket && boards.size) openSocket(address)
      })
  }

  const openSocket = (address: string) => {
    let opened = false
    const ws = open(address)
    socket = ws
    ws.onmessage = (event) => {
      try { handle(JSON.parse(String(event.data))) } catch { /* 형식이 다른 메시지는 무시 */ }
      if (ready) opened = true
    }
    ws.onclose = () => {
      if (socket !== ws) return
      socket = null
      ready = false
      joined.clear()
      pending.forEach((request) => { window.clearTimeout(request.timer); request.reject(new RealtimeError('WS_CLOSED', '실시간 연결 끊김')) })
      pending.clear()
      if (!boards.size) return
      if (!opened && ++failedOpens >= MAX_FAILED_OPENS) {
        console.warn('[WS] 실시간 연결 실패: 티켓 · 허용 origin 확인 필요 (다음 게시판 참여 때 다시 시도)')
        return
      }
      // 1012(서버 재시작 · 구독 끊김) 포함 모든 끊김은 다시 붙는다. 한꺼번에 몰리지 않게 지연을 흩뜨린다
      const delay = Math.min(MAX_DELAY, 1000 * 2 ** attempt++) * (0.5 + Math.random() / 2)
      retryTimer = window.setTimeout(connect, delay)
    }
  }

  // 화면이 다시 보이거나 네트워크가 돌아오면 기다리지 않고 바로 붙는다
  const wake = () => {
    if (document.visibilityState !== 'visible' || socket || connecting || !boards.size) return
    attempt = 0
    failedOpens = 0
    connect()
  }
  window.addEventListener('online', wake)
  document.addEventListener('visibilitychange', wake)

  return {
    // 게시판 실시간 구독. 연결 전이면 연결 후 참여한다
    join(boardId: string) {
      boards.add(boardId)
      if (ready) return joinOnServer(boardId)
      failedOpens = 0
      connect()
      return Promise.resolve()
    },
    // 이 게시판 실시간을 받고 있는지
    isJoined(boardId: string) {
      return ready && joined.has(boardId)
    },
    leave(boardId: string) {
      boards.delete(boardId)
      joinedOnce.delete(boardId)
      joined.delete(boardId)
      if (ready) send('board.leave', { boardId }).catch(() => undefined)
      if (!boards.size) this.close()
    },
    close() {
      boards.clear()
      joinedOnce.clear()
      joined.clear()
      window.clearTimeout(retryTimer)
      const ws = socket
      socket = null
      ready = false
      ws?.close(1000)
    },
    dispose() {
      this.close()
      window.removeEventListener('online', wake)
      document.removeEventListener('visibilitychange', wake)
    },
  }
}

export type Realtime = ReturnType<typeof createRealtime>
