import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function NotificationScreen() {
  const { notices, markNoticeRead, markAllNoticesRead, openBoard } = useApp()
  return <AppShell><header><h1>알림</h1><button className="text-button" onClick={markAllNoticesRead}>모두 읽음</button></header><div className="alerts">{notices.map((notice) => <button className={`alert ${notice.read ? '' : 'unread'}`} key={notice.id} onClick={() => { markNoticeRead(notice.id); if (notice.boardId) openBoard(notice.boardId) }}><span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>{!notice.read && <i/>}</button>)}</div></AppShell>
}
