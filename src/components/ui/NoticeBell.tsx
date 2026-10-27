import { Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'

// 탭 화면 오른쪽 위 알림 종. 안 읽은 알림 수를 빨간 배지로 보여주고, 누르면 알림 목록으로
export function NoticeBell() {
  const { notices, go } = useApp()
  const unread = notices.filter((notice) => !notice.read).length
  return <button className="notice-bell" onClick={() => go('alerts')} aria-label={unread ? `알림 ${unread}개 안 읽음` : '알림'}><Bell size={23}/>{unread > 0 && <b>{unread}</b>}</button>
}
