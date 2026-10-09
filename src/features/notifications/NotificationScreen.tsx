import { CheckCheck } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function NotificationScreen() {
  const { notices, markNoticeRead, markAllNoticesRead, openBoard } = useApp()
  const hasUnread = notices.some((notice) => !notice.read)
  return <AppShell><header><h1>알림</h1></header><div className="alerts">{notices.map((notice) => <button className={`alert ${notice.read ? '' : 'unread'}`} key={notice.id} onClick={() => { markNoticeRead(notice.id); if (notice.boardId) openBoard(notice.boardId) }}><span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>{!notice.read && <i/>}</button>)}</div>{hasUnread && <button className="alerts-read-all" onClick={markAllNoticesRead}><CheckCheck size={16}/>모두 읽음</button>}</AppShell>
}
