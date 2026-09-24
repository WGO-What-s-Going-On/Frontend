import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { useApp } from '../../context/AppContext'
import { TitleProgressCard } from './TitleProgressCard'

export function ProfileScreen() {
  const { user, boards, comments, go } = useApp()
  const postCount = boards.filter((board) => board.authorId === user.id).length
  const commentCount = comments.filter((comment) => comment.authorId === user.id).length
  return <AppShell><header><h1>마이페이지</h1><button className="text-button" onClick={() => go('profile-edit')}>프로필 수정</button></header><div className="profile"><b>{user.nickname.slice(0, 1)}</b><div><h3>{user.nickname} 님 {user.age}</h3><p>{user.bio}</p></div></div><TitleProgressCard postCount={postCount} commentCount={commentCount}/><h4>나의 활동</h4><button className="menu" onClick={() => go('activity')}>최근 활동내역 보기 <ChevronRight/></button><h4>설정 및 운영</h4><div className="menu-group"><button onClick={() => go('settings')}>계정관리 / 앱 설정 <ChevronRight/></button><button onClick={() => go('admin')}>프로토타입 관리자 화면 <ChevronRight/></button></div></AppShell>
}

export function ActivityScreen() {
  const { boards, comments, user, recentBoardIds, openBoard, go, inRange } = useApp()
  const [filter, setFilter] = useState<'최근 본' | '댓글 단' | '공감한' | '내가 작성한'>('최근 본')
  const participatingIds = new Set(comments.filter((comment) => comment.authorId === user.id).map((comment) => comment.boardId))
  const filters = [
    { label: '최근 본', count: recentBoardIds.length },
    { label: '댓글 단', count: participatingIds.size },
    { label: '공감한', count: boards.filter((board) => board.reactedByMe).length },
    { label: '내가 작성한', count: boards.filter((board) => board.authorId === user.id).length },
  ] as const
  const filtered = useMemo(() => filter === '최근 본'
    ? recentBoardIds.flatMap((id) => { const board = boards.find((item) => item.id === id); return board ? [board] : [] })
    : boards.filter((board) => filter === '댓글 단' && participatingIds.has(board.id) || filter === '공감한' && board.reactedByMe || filter === '내가 작성한' && board.authorId === user.id),
    [boards, filter, user.id, comments, recentBoardIds])
  // 기존에는 아무것도 없을 때 화면이 그냥 비어 있어 고장인지 빈 것인지 알 수 없었다.
  const emptyCopy = {
    '최근 본': '게시판을 열어보면 여기에 쌓여요.',
    '댓글 단': '댓글을 남기면 여기에서 다시 찾을 수 있어요.',
    '공감한': '공감을 누른 게시판이 여기에 모여요.',
    '내가 작성한': '직접 만든 게시판이 여기에 모여요.',
  }[filter]
  return <AppShell>
    <BackHeader title="최근 활동 내역" onBack={() => go('my')}/>
    <div className="chips activity-filters">{filters.map((item) => <button key={item.label} className={filter === item.label ? 'selected' : ''} onClick={() => setFilter(item.label)}>{item.label}<span>{item.count}</span></button>)}</div>
    <div className="post-list compact">{filtered.length
      ? filtered.map((board) => <BoardCard key={board.id} board={board} inRange={inRange} showBody commentCount={comments.filter((comment) => comment.boardId === board.id).length} onOpen={() => openBoard(board.id)}/>)
      : <EmptyState title={`'${filter}' 게시판이 없어요`} description={emptyCopy} action="지도에서 찾아보기" onAction={() => go('home')}/>}
    </div>
  </AppShell>
}

export function ProfileEditScreen() {
  const { user, updateUser, go } = useApp()
  const [nickname, setNickname] = useState(user.nickname)
  const [bio, setBio] = useState(user.bio)
  return <AppShell><BackHeader title="프로필 수정" onBack={() => go('my')}/><label>닉네임</label><input className="field" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={12}/><label>한 줄 소개</label><textarea className="field" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={80}/><button className="primary" disabled={!nickname.trim()} onClick={() => updateUser({ nickname: nickname.trim(), bio: bio.trim() })}>저장</button></AppShell>
}

export function SettingsScreen() {
  const { blockedUsers, unblockUser, comments, boards, go, showToast, notificationSettings, updateNotificationSettings } = useApp()
  const [withdraw, setWithdraw] = useState(false)
  // 차단은 되돌릴 수 없는 행동이었다. 누구를 차단했는지 보여주고 해제할 수 있게 한다.
  const nameOf = (id: string) => comments.find((comment) => comment.authorId === id)?.authorName ?? boards.find((board) => board.authorId === id)?.authorName ?? id
  return <AppShell>
    <BackHeader title="계정관리 / 앱 설정" onBack={() => go('my')}/>
    <h4>알림 설정</h4>
    <label className="setting-row"><span>주변 새 게시판 알림</span><input type="checkbox" checked={notificationSettings.nearby} onChange={(event) => updateNotificationSettings({ ...notificationSettings, nearby: event.target.checked })}/></label>
    <label className="setting-row"><span>댓글과 답글 알림</span><input type="checkbox" checked={notificationSettings.replies} onChange={(event) => updateNotificationSettings({ ...notificationSettings, replies: event.target.checked })}/></label>
    <h4>차단 사용자 {blockedUsers.length > 0 && <small>{blockedUsers.length}</small>}</h4>
    {blockedUsers.length
      ? <div className="blocked-list">{blockedUsers.map((id) => <div className="blocked-row" key={id}><span>{nameOf(id)}</span><button onClick={() => unblockUser(id)}>차단 해제</button></div>)}</div>
      : <p className="muted">차단한 사용자가 없어요.</p>}
    <h4>계정</h4>
    <button className="menu" onClick={() => { showToast('로그아웃했습니다.'); go('login') }}>로그아웃</button>
    <button className="danger-text" onClick={() => setWithdraw(true)}>회원 탈퇴</button>
    {withdraw && <ConfirmDialog title="정말 탈퇴할까요?" description="작성한 게시판과 댓글은 복구할 수 없어요." confirmLabel="탈퇴" danger onClose={() => setWithdraw(false)} onConfirm={() => { showToast('회원 탈퇴 처리되었습니다.'); go('login') }}/>}
  </AppShell>
}
