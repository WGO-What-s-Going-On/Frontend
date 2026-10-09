import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function NotificationScreen() {
  const { notices, markAllNoticesRead, openBoard } = useApp()
  // 들어올 때 안 읽은 알림을 기억해 두고 바로 모두 읽음 처리한다.
  // 이번 방문 동안은 기억해 둔 알림에 새 알림 표시를 유지하고, 다시 들어오면 사라진다.
  const [newNoticeIds] = useState(() => new Set(notices.filter((notice) => !notice.read).map((notice) => notice.id)))
  useEffect(() => {
    if (newNoticeIds.size > 0) markAllNoticesRead()
    // 화면에 들어올 때 한 번만 처리한다 (markAllNoticesRead는 렌더마다 새로 만들어진다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <AppShell><header><h1>알림</h1></header><div className="alerts">{notices.map((notice) => <button className={`alert ${newNoticeIds.has(notice.id) ? 'unread' : ''}`} key={notice.id} onClick={() => { if (notice.boardId) openBoard(notice.boardId) }}><span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>{newNoticeIds.has(notice.id) && <i/>}</button>)}</div></AppShell>
}
