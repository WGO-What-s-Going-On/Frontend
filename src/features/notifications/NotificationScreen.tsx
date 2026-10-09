import { CheckCheck } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function NotificationScreen() {
  const { notices, markNoticeRead, markAllNoticesRead, openBoard } = useApp()
  const hasUnread = notices.some((notice) => !notice.read)
  const readAll = <div className="alerts-read-all-bar"><button className="alerts-read-all" onClick={markAllNoticesRead} disabled={!hasUnread}><CheckCheck size={16}/>모두 읽음</button></div>
  return <AppShell contentClassName="alerts-screen" bottomContent={readAll}><header><h1>알림</h1></header><div className="alerts">{notices.map((notice) => <button className={`alert ${notice.read ? '' : 'unread'}`} key={notice.id} onClick={() => { markNoticeRead(notice.id); if (notice.boardId) openBoard(notice.boardId) }}><span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>{!notice.read && <i/>}</button>)}</div></AppShell>
}
