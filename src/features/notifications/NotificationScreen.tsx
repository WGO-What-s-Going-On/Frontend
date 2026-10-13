import { useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'
import type { Notice } from '../../types/domain'

const ACTIONS_WIDTH = 144 // 읽음 72 + 삭제 72
const OPEN_THRESHOLD = 56

// 알림 한 줄. 왼쪽으로 밀면 오른쪽에 읽음·삭제 버튼이 드러난다.
function NoticeRow({ notice, open, onOpenChange }: { notice: Notice; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { markNoticeRead, deleteNotice, openNotice } = useApp()
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
        openNotice(notice)
      }}
    ><span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>{!notice.read && <i/>}</button>
  </div>
}

export function NotificationScreen() {
  const { notices, markAllNoticesRead } = useApp()
  const [openId, setOpenId] = useState<string | null>(null)
  return <AppShell><header><h1>알림</h1><button className="text-button" onClick={markAllNoticesRead}>모두 읽음</button></header><div className="alerts">{notices.map((notice) => <NoticeRow key={notice.id} notice={notice} open={openId === notice.id} onOpenChange={(open) => setOpenId(open ? notice.id : null)}/>)}</div></AppShell>
}
