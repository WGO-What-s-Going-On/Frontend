import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { PullRefresh } from '../../components/ui/PullRefresh'
import { usePullToRefresh } from '../../components/ui/usePullToRefresh'
import { BackHeader } from '../../components/ui/BackHeader'
import { useApp } from '../../context/AppContext'
import type { Notice } from '../../types/domain'

const ACTIONS_WIDTH = 150 // 알림 카드와 틈 6 + 읽음 72 + 삭제 72
const OPEN_THRESHOLD = 56

// 서버 알림 내용 줄: 앞에 게시물 제목을 붙인다
// "게시물이 종료되었습니다." → "‘제목’ 게시물이 종료되었습니다." / "댓글이 …" → "‘제목’ 글의 댓글이 …"
function noticeBody({ body = '', postTitle, gone }: Notice) {
  if (gone) return `${body} · 삭제된 게시물`
  if (!postTitle) return body
  const title = `‘${postTitle}’`
  if (body.startsWith('게시물')) return `${title} ${body}`
  if (body.startsWith('댓글') || body.startsWith('답글')) return `${title} 글의 ${body}`
  return `${title} · ${body}`
}

// 알림 한 줄. 왼쪽으로 밀면 오른쪽에 읽음·삭제 버튼이 드러난다.
function NoticeRow({ notice, open, onOpenChange }: { notice: Notice; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { markNoticeRead, deleteNotice, openBoard, showToast } = useApp()
  const [dragX, setDragX] = useState<number | null>(null)
  const start = useRef<{ x: number; y: number; base: number; axis: 'x' | 'y' | null } | null>(null)
  const moved = useRef(false)
  const offset = dragX ?? (open ? -ACTIONS_WIDTH : 0)

  const onPointerDown = (event: React.PointerEvent) => {
    start.current = { x: event.clientX, y: event.clientY, base: open ? -ACTIONS_WIDTH : 0, axis: null }
    moved.current = false
  }
  const onPointerMove = (event: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = event.clientX - s.x, dy = event.clientY - s.y
    if (!s.axis && Math.abs(dx) + Math.abs(dy) > 6) s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (s.axis !== 'x') return
    moved.current = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    setDragX(Math.min(0, Math.max(-ACTIONS_WIDTH - 24, s.base + dx)))
  }
  const onPointerUp = () => {
    if (start.current?.axis === 'x' && dragX !== null) onOpenChange(dragX < -OPEN_THRESHOLD)
    start.current = null
    setDragX(null)
  }

  return <div className={`alert-swipe ${offset < 0 ? 'revealed' : ''}`}>
    <div className="alert-swipe-actions" aria-hidden={!open}>
      <button className="alert-swipe-read" tabIndex={open ? 0 : -1} onClick={() => { markNoticeRead(notice.id); onOpenChange(false) }}>읽음</button>
      <button className="alert-swipe-delete" tabIndex={open ? 0 : -1} onClick={() => deleteNotice(notice.id)}>삭제</button>
    </div>
    <button
      className={`alert ${notice.read ? '' : 'unread'} ${dragX !== null ? 'dragging' : ''}`}
      style={{ transform: `translateX(${offset}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => {
        if (moved.current) return
        if (open) { onOpenChange(false); return }
        markNoticeRead(notice.id)
        // 삭제된 게시물은 열면 빈 화면이라 알려만 준다
        if (notice.gone) { showToast('삭제된 게시물이라 열 수 없어요.'); return }
        if (notice.boardId) openBoard(notice.boardId)
      }}
    >{notice.title
      // 서버 알림: 제목 한 줄 + "'게시물 제목' 내용" 한 줄
      ? <span><strong>{notice.title}</strong><span className="alert-body">{noticeBody(notice)}</span><small>{notice.createdAt}</small></span>
      : <span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>}{!notice.read && <i/>}</button>
  </div>
}

export function NotificationScreen() {
  const { notices, markAllNoticesRead, go, refreshNotices } = useApp()
  const [openId, setOpenId] = useState<string | null>(null)
  // 맨 위에서 당겨서 알림 새로 받기
  const { pull, refreshing, ready } = usePullToRefresh(true, refreshNotices)
  const location = useLocation()
  const navigate = useNavigate()
  // 탭이 아니라 종에서 들어오는 화면: 뒤로 가면 종을 누른 화면으로
  return <AppShell nav={false} contentClassName="alerts-screen"><PullRefresh pull={pull} refreshing={refreshing} ready={ready}/><BackHeader title="알림" onBack={() => location.key === 'default' ? go('home') : navigate(-1)} action={<button className="text-button" onClick={markAllNoticesRead}>모두 읽음</button>}/><div className="alerts">{notices.map((notice) => <NoticeRow key={notice.id} notice={notice} open={openId === notice.id} onOpenChange={(open) => setOpenId(open ? notice.id : null)}/>)}</div></AppShell>
}
