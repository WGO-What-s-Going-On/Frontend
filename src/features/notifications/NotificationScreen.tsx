import { useMemo, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useApp } from '../../context/AppContext'
import type { Notice } from '../../types/domain'

function noticeLabel(type: Notice['type']) {
  if (type === 'nearby') return '주변 상황'
  if (type === 'lifecycle') return '상태 변경'
  return '내 활동'
}

function groupSummary(notices: Notice[]) {
  const replies = notices.filter((notice) => notice.type === 'reply').length
  const reactions = notices.filter((notice) => notice.type === 'reaction').length
  const parts = []
  if (replies) parts.push(`새 답글 ${replies}개`)
  if (reactions) parts.push(`공감 알림 ${reactions}개`)
  return parts.length ? parts.join(' · ') : notices[0]?.text
}

function groupLabel(notices: Notice[]) {
  const hasNearbyUpdate = notices.some((notice) => notice.type === 'nearby' || notice.type === 'lifecycle')
  const hasMyActivity = notices.some((notice) => notice.type === 'reply' || notice.type === 'reaction')
  return hasNearbyUpdate && hasMyActivity ? '게시글 활동' : noticeLabel(notices[0].type)
}

export function NotificationScreen() {
  const { notices, boards, markNoticeRead, markAllNoticesRead, openBoard } = useApp()
  const [pastOpen, setPastOpen] = useState(false)
  const needsAttention = notices.filter((notice) => !notice.read && (notice.type === 'nearby' || notice.type === 'lifecycle'))
  const pastNotices = notices.filter((notice) => notice.read && (notice.type === 'lifecycle' || notice.createdAt.includes('일 전')))
  const recentNotices = notices.filter((notice) => !needsAttention.includes(notice) && !pastNotices.includes(notice))
  const recentGroups = useMemo(() => Object.values(recentNotices.reduce<Record<string, Notice[]>>((groups, notice) => {
    const key = notice.boardId || notice.id
    groups[key] = [...(groups[key] || []), notice]
    return groups
  }, {})), [recentNotices])
  const unreadCount = notices.filter((notice) => !notice.read).length

  const openNotice = (notice: Notice) => {
    markNoticeRead(notice.id)
    if (notice.boardId) openBoard(notice.boardId)
  }
  const openGroup = (group: Notice[]) => {
    group.forEach((notice) => markNoticeRead(notice.id))
    const boardId = group.find((notice) => notice.boardId)?.boardId
    if (boardId) openBoard(boardId)
  }

  return <AppShell contentClassName="notification-screen">
    <header className="notification-header"><h1>알림</h1>{unreadCount > 0 && <button className="text-button" onClick={markAllNoticesRead}>모두 읽음</button>}</header>

    {needsAttention.length > 0 && <section className="notification-section"><div className="notification-section-title"><h2>확인 필요</h2><span>{needsAttention.length}</span></div><div className="notification-list">{needsAttention.map((notice) => <button className="notification-item important" key={notice.id} onClick={() => openNotice(notice)}><small>{noticeLabel(notice.type)}</small><strong>{notice.text}</strong><span>{notice.createdAt}</span><i aria-label="읽지 않음"/></button>)}</div></section>}

    <section className="notification-section"><div className="notification-section-title"><h2>최근 알림</h2></div>{recentGroups.length ? <div className="notification-list">{recentGroups.map((group) => { const board = boards.find((item) => item.id === group[0].boardId); const unread = group.some((notice) => !notice.read); return <button className="notification-item grouped" key={group[0].boardId || group[0].id} onClick={() => openGroup(group)}><small>{groupLabel(group)}</small><strong>{board?.title || '주변 게시판 소식'}</strong><p>{groupSummary(group)}</p><span>마지막 활동 {group[0].createdAt}</span>{unread && <i aria-label="읽지 않음"/>}</button> })}</div> : <div className="notification-empty">최근 알림이 없습니다.</div>}</section>

    {pastNotices.length > 0 && <section className="notification-past"><button className="notification-past-toggle" onClick={() => setPastOpen((open) => !open)} aria-expanded={pastOpen}>지난 알림 {pastNotices.length}개 {pastOpen ? '접기' : '보기'}</button>{pastOpen && <div className="notification-list past">{pastNotices.map((notice) => <button className="notification-item" key={notice.id} onClick={() => openNotice(notice)}><small>{noticeLabel(notice.type)}</small><strong>{notice.text}</strong><span>{notice.createdAt}</span></button>)}</div>}</section>}
  </AppShell>
}
