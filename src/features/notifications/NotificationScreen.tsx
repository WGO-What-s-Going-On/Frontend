import { BellCheck } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function NotificationScreen() {
  const { notices, markNoticeRead, markAllNoticesRead, openBoard } = useApp()
  const unreadCount = notices.filter((notice) => !notice.read).length
  return <AppShell><header><h1>알림</h1></header>{unreadCount > 0 && <div className="alerts-unread-bar"><span>읽지 않은 알림 <b>{unreadCount}</b>개</span><button className="alerts-read-all" onClick={markAllNoticesRead}><BellCheck size={16}/>모두 읽음</button></div>}<div className="alerts">{notices.map((notice) => <button className={`alert ${notice.read ? '' : 'unread'}`} key={notice.id} onClick={() => { markNoticeRead(notice.id); if (notice.boardId) openBoard(notice.boardId) }}><span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>{!notice.read && <i/>}</button>)}</div></AppShell>
}
