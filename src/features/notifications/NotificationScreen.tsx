import { BellCheck } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'

export function NotificationScreen() {
  const { notices, markNoticeRead, markAllNoticesRead, openBoard } = useApp()
  const unreadCount = notices.filter((notice) => !notice.read).length
  const readAll = unreadCount > 0 && <button className="alerts-read-all-float" onClick={markAllNoticesRead} aria-label={`읽지 않은 알림 ${unreadCount}개 모두 읽음`}><BellCheck size={17}/>모두 읽음<b>{unreadCount}</b></button>
  return <AppShell contentClassName="alerts-screen" bottomContent={readAll}><header><h1>알림</h1></header><div className="alerts">{notices.map((notice) => <button className={`alert ${notice.read ? '' : 'unread'}`} key={notice.id} onClick={() => { markNoticeRead(notice.id); if (notice.boardId) openBoard(notice.boardId) }}><span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>{!notice.read && <i/>}</button>)}</div></AppShell>
}
