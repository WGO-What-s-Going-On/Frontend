import { Clock3, MapPin, MessageCircle, ThumbsUp } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { useApp } from '../../context/AppContext'
import type { Notice } from '../../types/domain'

/** notice.type은 정의만 되고 쓰이지 않아 모든 알림이 똑같아 보였다. 아이콘으로만 구분한다. */
const KIND = {
  nearby: MapPin,
  reply: MessageCircle,
  reaction: ThumbsUp,
  lifecycle: Clock3,
} satisfies Record<Notice['type'], typeof MapPin>

export function NotificationScreen() {
  const { notices, markNoticeRead, markAllNoticesRead, openBoard, go } = useApp()
  const unread = notices.filter((notice) => !notice.read)
  const read = notices.filter((notice) => notice.read)

  const open = (notice: Notice) => {
    markNoticeRead(notice.id)
    // 답글 알림이면 글 맨 위가 아니라 그 댓글로 이동한다.
    if (notice.boardId) openBoard(notice.boardId, notice.commentId)
  }

  const row = (notice: Notice) => {
    const Icon = KIND[notice.type]
    return <button className={`alert ${notice.read ? '' : 'unread'}`} key={notice.id} onClick={() => open(notice)}>
      <b><Icon size={17}/></b>
      <span><strong>{notice.text}</strong><small>{notice.createdAt}</small></span>
      {!notice.read && <i/>}
    </button>
  }

  return <AppShell>
    <header><h1>알림</h1>{unread.length > 0 && <button className="text-button" onClick={markAllNoticesRead}>모두 읽음</button>}</header>
    {notices.length === 0
      ? <EmptyState title="아직 알림이 없어요" action="지도 보러 가기" onAction={() => go('home')}/>
      : <>
          {unread.length > 0 && <><h4>읽지 않음 {unread.length}</h4><div className="alerts">{unread.map(row)}</div></>}
          {read.length > 0 && <><h4>지난 알림</h4><div className="alerts">{read.map(row)}</div></>}
        </>}
  </AppShell>
}
