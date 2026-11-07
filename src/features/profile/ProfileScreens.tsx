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
import { Archive, Camera, Loader2, Moon, Sun, Trash2 } from 'lucide-react'
import { useApp, type NotificationSettings } from '../../context/AppContext'
import { disableWebPush, enableWebPush, webPushState, type WebPushState } from '../../api/webPush'
import { nicknameError, nicknameFormatError } from '../../domain/nickname'
import { apiEnabled } from '../../api/config'
import { checkNickname as checkNicknameApi } from '../../api/users'
import { commentCountOf, myReactions } from '../../types/domain'
import type { Board } from '../../types/domain'
import { TitleProgressCard } from './TitleProgressCard'
import { levelStats } from '../level/levels'

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
  const { user, boards, comments, go, themeMode, toggleTheme, logout, withdraw, live, serverLevel, profileImageUrl } = useApp()
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const withdrawDialog = withdrawOpen && <ConfirmDialog title="정말 탈퇴할까요?" description="30일 안에 다시 로그인하면 탈퇴가 취소돼요. 이후에는 계정을 복구할 수 없어요." confirmLabel="탈퇴" danger onClose={() => setWithdrawOpen(false)} onConfirm={() => { setWithdrawOpen(false); withdraw() }}/>
  return <AppShell bottomContent={withdrawDialog}><header><h1>마이페이지</h1><ThemeSwitch dark={themeMode === 'dark'} onToggle={toggleTheme}/></header><TitleProgressCard stats={live && serverLevel ? serverLevel : levelStats(boards, comments, user.id)} name={user.nickname} photo={profileImageUrl ?? undefined} onOpen={() => go('profile-edit')}/><h4>나의 활동</h4><button className="menu" onClick={() => go('activity')}>최근 활동내역 보기</button><h4>설정</h4><div className="menu-group account-actions"><button onClick={() => go('notification-settings')}>알림 설정</button><button onClick={logout}>로그아웃</button><button className="account-withdraw" onClick={() => setWithdrawOpen(true)}>회원 탈퇴</button></div></AppShell>
}

export function ActivityScreen() {
  const { boards, comments, user, recentBoardIds, openBoard, go, finishBoard, deleteBoard, live, loadActivity } = useApp()
  // 내가 쓴 글: 오른쪽 위 보관(종료) · 삭제. 지우거나 보관해도 이 화면에 그대로 있는다
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'delete'; board: Board } | null>(null)
  const confirmDialog = confirm && (confirm.kind === 'delete'
    ? <ConfirmDialog title="게시글을 삭제할까요?" description="삭제한 글은 되돌릴 수 없어요." confirmLabel="삭제" danger onClose={() => setConfirm(null)} onConfirm={() => { deleteBoard(confirm.board.id); setConfirm(null) }}/>
    : <ConfirmDialog title="게시글을 보관할까요?" description="보관하면 게시판이 종료돼 새 댓글을 받지 않고 지도에서 사라져요. 글은 최근 활동에 남아요." confirmLabel="보관" onClose={() => setConfirm(null)} onConfirm={() => { finishBoard(confirm.board.id); setConfirm(null) }}/>)
  const myActions = (board: Board) => board.authorId === user.id ? <>
    {board.status === '실시간' && <IconButton className="board-corner-button" label={`${board.title} 보관`} onClick={() => setConfirm({ kind: 'archive', board })}><Archive size={17}/></IconButton>}
    <IconButton className="board-corner-button" label={`${board.title} 삭제`} onClick={() => setConfirm({ kind: 'delete', board })}><Trash2 size={17}/></IconButton>
  </> : undefined
  const [filter, setFilter] = useState<'최근 본' | '댓글 단' | '공감한' | '내가 작성한' | '종료된'>('최근 본')
  // 서버 연동 중에는 서버 활동 기록으로 (주변 목록에 없는 글 · 종료된 글도 포함)
  const [serverActivity, setServerActivity] = useState<{ written: string[]; commented: string[]; reacted: string[] } | null>(null)
  useEffect(() => { if (live) loadActivity().then(setServerActivity).catch(() => undefined) }, [live])
  const byIds = (ids: string[]) => ids.flatMap((id) => { const board = boards.find((item) => item.id === id); return board ? [board] : [] })
  const participatingIds = new Set(comments.filter((comment) => comment.authorId === user.id).map((comment) => comment.boardId))
  const lists = {
    '최근 본': byIds(recentBoardIds),
    '댓글 단': serverActivity ? byIds(serverActivity.commented) : boards.filter((board) => participatingIds.has(board.id)),
    '공감한': serverActivity ? byIds(serverActivity.reacted) : boards.filter((board) => myReactions(board).length > 0),
    '내가 작성한': serverActivity ? byIds(serverActivity.written) : boards.filter((board) => board.authorId === user.id),
  }
  // 종료된: 위 활동(본 · 댓글 · 공감 · 작성) 중 종료된 게시판만 한데 모은다
  const ended = [...new Map([...lists['최근 본'], ...lists['댓글 단'], ...lists['공감한'], ...lists['내가 작성한']].filter((board) => board.status === '종료됨').map((board) => [board.id, board])).values()]
  const allLists = { ...lists, '종료된': ended }
  const filters = (['최근 본', '댓글 단', '공감한', '내가 작성한', '종료된'] as const).map((label) => ({ label, count: allLists[label].length }))
  const filtered = allLists[filter]
  const emptyText = { '최근 본': '최근에 본 게시판이 없어요.', '댓글 단': '댓글을 단 게시판이 없어요.', '공감한': '반응을 남긴 게시판이 없어요.', '내가 작성한': '작성한 게시판이 없어요.', '종료된': '종료된 게시판이 없어요.' }
  // 게시판 목록과 같은 여백·칩·카드를 써서 같은 화면처럼 보이게 한다
  return <AppShell contentClassName="ux-board-screen activity-screen" bottomContent={confirmDialog}><BackHeader title="최근 활동" onBack={() => go('my')}/>
    <div className="ux-filter-row"><FilterChips className="ux-category-filters activity-chips" options={filters.map((item) => ({ value: item.label, count: item.count }))} selected={filter} onSelect={setFilter}/></div>
    <div className="ux-board-list">{filtered.length ? filtered.map((board) => <BoardCard key={board.id} board={board} commentCount={commentCountOf(board, comments)} onOpen={() => openBoard(board.id)} corner={myActions(board)}/>) : <EmptyState title={emptyText[filter]}/>}</div>
  </AppShell>
}

// 프로필 수정: 실명(비공개)과 닉네임. 닉네임을 바꾸면 중복 확인을 거쳐야 저장할 수 있다.
export function ProfileEditScreen() {
  const { user, boards, comments, updateUser, go, profileImageUrl, changeProfileImage, removeProfileImage } = useApp()
  const [realName, setRealName] = useState(user.realName ?? '')
  const photoRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const pickPhoto = async (file?: File) => {
    if (!file) return
    setPhotoBusy(true)
    await changeProfileImage(file)
    setPhotoBusy(false)
  }
  const [nickname, setNickname] = useState(user.nickname)
  const [checked, setChecked] = useState<{ name: string; error: string } | null>(null)
  const trimmed = nickname.trim()
  const changed = trimmed !== user.nickname
  const formatError = nicknameFormatError(trimmed)
  const result = checked?.name === trimmed ? checked : null
  const taken = new Set([...boards, ...comments].filter((item) => item.authorId !== user.id).map((item) => item.authorName))
  // 중복 확인: 서버가 있으면 서버에, 목업이면 이미 쓰이는 이름과 비교
  const checkNickname = async () => {
    const formatError = nicknameError(trimmed, apiEnabled ? new Set() : taken)
    if (formatError || !apiEnabled) { setChecked({ name: trimmed, error: formatError }); return }
    try {
      const { available } = await checkNicknameApi(trimmed)
      setChecked({ name: trimmed, error: available ? '' : '이미 사용 중인 닉네임이에요.' })
    } catch { setChecked({ name: trimmed, error: '확인하지 못했어요. 다시 눌러 주세요.' }) }
  }
  const message = !changed ? '' : formatError || (result ? result.error || '사용할 수 있는 닉네임이에요.' : '중복 확인을 해 주세요.')
  const messageTone = !changed ? '' : formatError || result?.error ? 'error' : result ? 'ok' : 'hint'
  const canSave = Boolean(realName.trim() && trimmed) && (!changed || (result !== null && !result.error))
  return <AppShell contentClassName="profile-edit-screen"><BackHeader title="프로필 수정" onBack={() => go('my')}/>
    {/* 프로필 사진: 사진을 누르면 앨범 · 카메라에서 고른다 */}
    <div className="profile-edit-avatar">
      <button className="profile-photo-button" onClick={() => photoRef.current?.click()} disabled={photoBusy} aria-label="프로필 사진 바꾸기">
        <Avatar src={profileImageUrl ?? undefined} name={trimmed || user.nickname} size={80}/>
        <span className="profile-photo-badge" aria-hidden="true">{photoBusy ? <Loader2 size={15} className="spin"/> : <Camera size={15}/>}</span>
      </button>
      {profileImageUrl && <button className="text-button profile-photo-remove" onClick={removeProfileImage} disabled={photoBusy}>사진 삭제</button>}
      <input ref={photoRef} className="quick-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={(event) => { pickPhoto(event.target.files?.[0]); event.target.value = '' }}/>
    </div>
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
  { key: 'reactions', title: '반응·하트', description: '내 글과 댓글에 반응이 달리면 알려드려요' },
  { key: 'lifecycle', title: '게시판 종료', description: '참여한 게시판이 곧 종료되거나 종료되면 알려드려요' },
]

// 이 기기 푸시 알림(웹 · 홈 화면 앱). 앱(iOS · 안드로이드)은 앱 푸시가 따로 있어 보이지 않는다
const pushHelp: Record<WebPushState, string> = {
  on: '이 기기로 알림을 보내드려요',
  off: '켜면 앱을 닫아도 이 기기로 알림이 와요',
  denied: '브라우저 설정에서 이 사이트 알림을 허용해 주세요',
  'needs-install': '아이폰은 Safari 공유 버튼 → 홈 화면에 추가로 연 앱에서 켤 수 있어요',
  unsupported: '',
}

function DevicePushSetting() {
  const { showToast, live } = useApp()
  const [state, setState] = useState<WebPushState>(webPushState)
  const [busy, setBusy] = useState(false)
  if (state === 'unsupported' || !live) return null
  const toggle = async (on: boolean) => {
    setBusy(true)
    try {
      if (on) {
        const next = await enableWebPush()
        setState(next)
        if (next === 'on') showToast('이 기기 푸시 알림을 켰어요.')
      } else { await disableWebPush(); setState('off') }
    } catch { showToast('푸시 알림을 켜지 못했어요. 다시 시도해 주세요.'); setState(webPushState()) } finally { setBusy(false) }
  }
  return <div className="menu-group setting-list device-push">
    <label className="setting-toggle">
      <span><strong>이 기기 푸시 알림</strong><small>{pushHelp[state]}</small></span>
      <input type="checkbox" role="switch" checked={state === 'on'} disabled={busy || state === 'denied' || state === 'needs-install'} onChange={(event) => toggle(event.target.checked)}/>
    </label>
  </div>
}

export function NotificationSettingsScreen() {
  const { notificationSettings, updateNotificationSettings, go } = useApp()
  return <AppShell><BackHeader title="알림 설정" onBack={() => go('my')}/>
    <DevicePushSetting/>
    <div className="menu-group setting-list">{notificationOptions.map((option) => <label key={option.key} className="setting-toggle">
      <span><strong>{option.title}</strong><small>{option.description}</small></span>
      <input type="checkbox" role="switch" checked={notificationSettings[option.key]} onChange={(event) => updateNotificationSettings({ ...notificationSettings, [option.key]: event.target.checked })}/>
    </label>)}</div>
  </AppShell>
}

