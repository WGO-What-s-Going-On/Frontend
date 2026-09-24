import { Clock3, MapPin, MessageCircle, ThumbsUp } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { useApp } from '../../context/AppContext'
import type { Notice } from '../../types/domain'

/** notice.type은 정의만 되고 쓰이지 않아 모든 알림이 똑같아 보였다. 무엇 때문에 온 알림인지 먼저 알려준다. */
const KIND = {
  nearby: { icon: MapPin, label: '주변 새 소식' },
  reply: { icon: MessageCircle, label: '답글' },
  reaction: { icon: ThumbsUp, label: '공감' },
  lifecycle: { icon: Clock3, label: '게시판 상태' },
} satisfies Record<Notice['type'], { icon: typeof MapPin; label: string }>

export function NotificationScreen() {
  const { notices, boards, markNoticeRead, markAllNoticesRead, openBoard, go } = useApp()
  const unread = notices.filter((notice) => !notice.read)
  const read = notices.filter((notice) => notice.read)

  const open = (notice: Notice) => {
    markNoticeRead(notice.id)
    // 답글 알림이면 글 맨 위가 아니라 그 댓글로 이동한다.
    if (notice.boardId) openBoard(notice.boardId, notice.commentId)
  }

  const row = (notice: Notice) => {
    const { icon: Icon, label } = KIND[notice.type]
    const board = boards.find((item) => item.id === notice.boardId)
    return <button className={`alert ${notice.read ? '' : 'unread'}`} key={notice.id} onClick={() => open(notice)}>
      <b><Icon size={17}/></b>
      <span>
        <small className="alert-kind">{label}{board ? ` · ${board.title}` : ''}</small>
        <strong>{notice.text}</strong>
        <small>{notice.createdAt}{notice.commentId ? ' · 해당 댓글로 이동' : ''}</small>
      </span>
      {!notice.read && <i/>}
    </button>
  }

  return <AppShell>
    <header><h1>알림</h1>{unread.length > 0 && <button className="text-button" onClick={markAllNoticesRead}>모두 읽음</button>}</header>
    {notices.length === 0
      ? <EmptyState title="아직 알림이 없어요" description="주변에 새 게시판이 생기거나 내 댓글에 답글이 달리면 알려드려요." action="지도 보러 가기" onAction={() => go('home')}/>
      : <>
          {unread.length > 0 && <><h4>읽지 않음 {unread.length}</h4><div className="alerts">{unread.map(row)}</div></>}
          {read.length > 0 && <><h4>지난 알림</h4><div className="alerts">{read.map(row)}</div></>}
        </>}
  </AppShell>
}
