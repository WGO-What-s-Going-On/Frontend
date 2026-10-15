import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Avatar } from '../../components/ui/Avatar'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterChips } from '../../components/ui/FilterChips'
import { IconButton } from '../../components/ui/IconButton'
import { Moon, Sun } from 'lucide-react'
import { useApp, type NotificationSettings } from '../../context/AppContext'
import { nicknameError, nicknameFormatError } from '../../domain/nickname'
import { myReactions } from '../../types/domain'
import { TitleProgressCard } from './TitleProgressCard'

// 뱃지 (USR-F12): 도움 활동에 따라 얻는다. 실제 획득 기준은 백엔드가 계산한다.
function earnedBadges({ posts, comments, likes, finished }: { posts: number; comments: number; likes: number; finished: number }) {
  return [
    { name: '첫 소식', hint: '게시판 1개 만들기', earned: posts >= 1 },
    { name: '해결사', hint: '내 게시판 1개 마무리', earned: finished >= 1 },
    { name: '탐정', hint: '댓글 도움돼요 10개 받기', earned: likes >= 10 },
    { name: '단골 이웃', hint: '댓글 10개 쓰기', earned: comments >= 10 },
  ]
}

// 화면 모드 토글: 왼쪽 해(라이트) · 오른쪽 달(다크). 손잡이가 먼저 미끄러진 뒤 화면 색이 겹쳐 바뀐다
function ThemeSwitch({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const [on, setOn] = useState(dark)
  const switching = useRef(false)
  useEffect(() => { setOn(dark); switching.current = false }, [dark])
  const toggle = () => {
    if (switching.current) return
    switching.current = true
    setOn(!dark)
    window.setTimeout(onToggle, 180)
  }
  return <button className={`theme-switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label="다크 모드" onClick={toggle}>
    <span className="theme-switch-thumb" aria-hidden="true"/>
    <Sun size={15} strokeWidth={2} aria-hidden="true"/>
    <Moon size={15} strokeWidth={2} aria-hidden="true"/>
  </button>
}

export function ProfileScreen() {
  const { user, boards, comments, go, showToast, themeMode, toggleTheme } = useApp()
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const myBoards = boards.filter((board) => board.authorId === user.id)
  const myComments = comments.filter((comment) => comment.authorId === user.id)
  const badges = earnedBadges({ posts: myBoards.length, comments: myComments.length, likes: myComments.reduce((sum, comment) => sum + comment.reactions['도움돼요'], 0), finished: myBoards.filter((board) => board.status === '종료됨').length })
  const withdrawDialog = withdrawOpen && <ConfirmDialog title="정말 탈퇴할까요?" description="탈퇴 후에는 계정을 복구할 수 없어요." confirmLabel="탈퇴" danger onClose={() => setWithdrawOpen(false)} onConfirm={() => { showToast('회원 탈퇴 처리되었습니다.'); go('login') }}/>
  return <AppShell bottomContent={withdrawDialog}><header><h1>마이페이지</h1><ThemeSwitch dark={themeMode === 'dark'} onToggle={toggleTheme}/></header><TitleProgressCard postCount={myBoards.length} commentCount={myComments.length} name={user.nickname} onOpen={() => go('profile-edit')}/><h4>뱃지 <small>{badges.filter((badge) => badge.earned).length}/{badges.length}</small></h4><ul className="badge-list">{badges.map((badge) => <li key={badge.name} className={badge.earned ? 'earned' : ''}><strong>{badge.name}</strong><small>{badge.earned ? '획득' : badge.hint}</small></li>)}</ul><h4>나의 활동</h4><button className="menu" onClick={() => go('activity')}>최근 활동내역 보기</button><h4>설정</h4><div className="menu-group account-actions"><button onClick={() => go('notification-settings')}>알림 설정</button><button onClick={() => { showToast('로그아웃했습니다.'); go('login') }}>로그아웃</button><button className="account-withdraw" onClick={() => setWithdrawOpen(true)}>회원 탈퇴</button></div></AppShell>
}

export function ActivityScreen() {
  const { boards, comments, user, recentBoardIds, openBoard, go } = useApp()
  const [filter, setFilter] = useState<'최근 본' | '댓글 단' | '공감한' | '내가 작성한'>('최근 본')
  const participatingIds = new Set(comments.filter((comment) => comment.authorId === user.id).map((comment) => comment.boardId))
  const filters = [
    { label: '최근 본', count: recentBoardIds.length },
    { label: '댓글 단', count: participatingIds.size },
    { label: '공감한', count: boards.filter((board) => myReactions(board).length > 0).length },
    { label: '내가 작성한', count: boards.filter((board) => board.authorId === user.id).length },
  ] as const
  const filtered = useMemo(() => filter === '최근 본' ? recentBoardIds.flatMap((id) => { const board = boards.find((item) => item.id === id); return board ? [board] : [] }) : boards.filter((board) => filter === '댓글 단' && participatingIds.has(board.id) || filter === '공감한' && myReactions(board).length > 0 || filter === '내가 작성한' && board.authorId === user.id), [boards, filter, user.id, comments, recentBoardIds])
  const emptyText = { '최근 본': '최근에 본 게시판이 없어요.', '댓글 단': '댓글을 단 게시판이 없어요.', '공감한': '반응을 남긴 게시판이 없어요.', '내가 작성한': '작성한 게시판이 없어요.' }
  // 게시판 목록과 같은 여백·칩·카드를 써서 같은 화면처럼 보이게 한다
  return <AppShell contentClassName="ux-board-screen activity-screen"><BackHeader title="최근 활동" onBack={() => go('my')}/>
    <div className="ux-filter-row"><FilterChips className="ux-category-filters activity-chips" options={filters.map((item) => ({ value: item.label, count: item.count }))} selected={filter} onSelect={setFilter}/></div>
    <div className="ux-board-list">{filtered.length ? filtered.map((board) => <BoardCard key={board.id} board={board} commentCount={comments.filter((comment) => comment.boardId === board.id).length} onOpen={() => openBoard(board.id)}/>) : <EmptyState title={emptyText[filter]}/>}</div>
  </AppShell>
}

// 프로필 수정: 실명(비공개)과 닉네임. 닉네임을 바꾸면 중복 확인을 거쳐야 저장할 수 있다.
export function ProfileEditScreen() {
  const { user, boards, comments, updateUser, go } = useApp()
  const [realName, setRealName] = useState(user.realName ?? '')
  const [nickname, setNickname] = useState(user.nickname)
  const [checked, setChecked] = useState<{ name: string; error: string } | null>(null)
  const trimmed = nickname.trim()
  const changed = trimmed !== user.nickname
  const formatError = nicknameFormatError(trimmed)
  const result = checked?.name === trimmed ? checked : null
  const taken = new Set([...boards, ...comments].filter((item) => item.authorId !== user.id).map((item) => item.authorName))
  const checkNickname = () => setChecked({ name: trimmed, error: nicknameError(trimmed, taken) })
  const message = !changed ? '' : formatError || (result ? result.error || '사용할 수 있는 닉네임이에요.' : '중복 확인을 해 주세요.')
  const messageTone = !changed ? '' : formatError || result?.error ? 'error' : result ? 'ok' : 'hint'
  const canSave = Boolean(realName.trim() && trimmed) && (!changed || (result !== null && !result.error))
  return <AppShell contentClassName="profile-edit-screen"><BackHeader title="프로필 수정" onBack={() => go('my')}/>
    <div className="profile-edit-avatar"><Avatar name={trimmed || user.nickname} size={80}/></div>
    <div className="form-field">
      <span className="form-label">실명</span>
      <input className="form-input" value={realName} onChange={(event) => setRealName(event.target.value)} placeholder="실명을 입력해 주세요" maxLength={20} autoComplete="name"/>
    </div>
    <div className="form-field">
      <span className="form-label">닉네임</span>
      <div className="input-with-action"><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임 (2~12자)" maxLength={12} autoComplete="nickname"/><button className="check-button" onClick={checkNickname} disabled={!changed || Boolean(formatError) || !trimmed}>중복 확인</button></div>
      <p className={`field-message ${messageTone}`} aria-live="polite">{message}</p>
    </div>
    <Button className="primary profile-save" disabled={!canSave} onClick={() => updateUser({ nickname: trimmed, realName: realName.trim() })}>저장</Button>
  </AppShell>
}


// 알림 설정: 알림 종류별로 받을지 정한다. 게시판 하나하나의 알림은 게시판 목록의 종 아이콘으로 켜고 끈다.
const notificationOptions: { key: keyof NotificationSettings; title: string; description: string }[] = [
  { key: 'nearby', title: '내 주변 새 게시판', description: '150m 안에 새 게시판이 생기면 알려드려요' },
  { key: 'replies', title: '댓글·답글', description: '내 글에 댓글, 내 댓글에 답글이 달리면 알려드려요' },
  { key: 'reactions', title: '반응·공감', description: '내 글과 댓글에 반응이 달리면 알려드려요' },
  { key: 'lifecycle', title: '게시판 종료', description: '참여한 게시판이 곧 종료되거나 종료되면 알려드려요' },
]

export function NotificationSettingsScreen() {
  const { notificationSettings, updateNotificationSettings, go } = useApp()
  return <AppShell><BackHeader title="알림 설정" onBack={() => go('my')}/>
    <div className="menu-group setting-list">{notificationOptions.map((option) => <label key={option.key} className="setting-toggle">
      <span><strong>{option.title}</strong><small>{option.description}</small></span>
      <input type="checkbox" role="switch" checked={notificationSettings[option.key]} onChange={(event) => updateNotificationSettings({ ...notificationSettings, [option.key]: event.target.checked })}/>
    </label>)}</div>
  </AppShell>
}

