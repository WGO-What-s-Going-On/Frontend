import { useMemo, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { Avatar } from '../../components/ui/Avatar'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FilterChips } from '../../components/ui/FilterChips'
import { useApp } from '../../context/AppContext'
import { myReactions } from '../../types/domain'
import { readImage } from '../board/WriteGuards'
import { TitleProgressCard } from './TitleProgressCard'

// 뱃지 (USR-F12): 도움 활동에 따라 얻는다. 실제 획득 기준은 백엔드가 계산한다.
function earnedBadges({ posts, comments, likes, resolved }: { posts: number; comments: number; likes: number; resolved: number }) {
  return [
    { name: '첫 소식', hint: '게시판 1개 만들기', earned: posts >= 1 },
    { name: '해결사', hint: '내 게시판 1개 해결', earned: resolved >= 1 },
    { name: '탐정', hint: '댓글 하트 10개 받기', earned: likes >= 10 },
    { name: '단골 이웃', hint: '댓글 10개 쓰기', earned: comments >= 10 },
  ]
}

export function ProfileScreen() {
  const { user, boards, comments, go } = useApp()
  const myBoards = boards.filter((board) => board.authorId === user.id)
  const myComments = comments.filter((comment) => comment.authorId === user.id)
  const badges = earnedBadges({ posts: myBoards.length, comments: myComments.length, likes: myComments.reduce((sum, comment) => sum + (comment.likes ?? 0), 0), resolved: myBoards.filter((board) => board.status === '해결됨').length })
  return <AppShell><header><h1>마이페이지</h1></header><TitleProgressCard postCount={myBoards.length} commentCount={myComments.length} name={user.nickname} profileImage={user.profileImage}/><h4>뱃지 <small>{badges.filter((badge) => badge.earned).length}/{badges.length}</small></h4><ul className="badge-list">{badges.map((badge) => <li key={badge.name} className={badge.earned ? 'earned' : ''}><strong>{badge.name}</strong><small>{badge.earned ? '획득' : badge.hint}</small></li>)}</ul><h4>나의 활동</h4><button className="menu" onClick={() => go('activity')}>최근 활동내역 보기 <ChevronRight/></button><h4>설정</h4><div className="menu-group"><button onClick={() => go('profile-edit')}>프로필 수정 <ChevronRight/></button><button onClick={() => go('account-settings')}>계정 관리 <ChevronRight/></button></div></AppShell>
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
  return <AppShell><BackHeader title="최근 활동 내역" onBack={() => go('my')}/><FilterChips className="chips activity-filters" options={filters.map((item) => ({ value: item.label, count: item.count }))} selected={filter} onSelect={setFilter}/><div className="post-list compact">{filtered.map((board) => <BoardCard key={board.id} board={board} showBody onOpen={() => openBoard(board.id)}/>)}</div></AppShell>
}

export function ProfileEditScreen() {
  const { user, updateUser, go } = useApp()
  const [nickname, setNickname] = useState(user.nickname)
  const [bio, setBio] = useState(user.bio)
  const [profileImage, setProfileImage] = useState(user.profileImage)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickImage = async (file?: File) => { if (file) setProfileImage(await readImage(file)) }
  return <AppShell><BackHeader title="프로필 수정" onBack={() => go('my')}/>
    <div className="profile-photo-edit"><Avatar src={profileImage} name={nickname || user.nickname} size={84}/><div><button className="text-button" onClick={() => fileRef.current?.click()}>사진 변경</button>{profileImage && <button className="text-button muted-button" onClick={() => setProfileImage(undefined)}>기본 이미지로</button>}</div><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickImage(event.target.files?.[0])}/></div>
    <label>닉네임</label><input className="field" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={12}/><label>한 줄 소개</label><textarea className="field" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={80}/><Button className="primary" disabled={!nickname.trim()} onClick={() => updateUser({ nickname: nickname.trim(), bio: bio.trim(), profileImage })}>저장</Button></AppShell>
}

export function AccountSettingsScreen() {
  const { blockedUsers, go, showToast, withdraw } = useApp()
  const [withdrawOpen, setWithdraw] = useState(false)
  return <AppShell><BackHeader title="계정 관리" onBack={() => go('my')}/><h4>차단 사용자</h4><div className="notice-box">차단한 사용자 {blockedUsers.length}명</div><h4>계정</h4><button className="menu" onClick={() => { showToast('로그아웃했습니다.'); go('login') }}>로그아웃</button><Button className="danger-text" onClick={() => setWithdraw(true)}>회원 탈퇴</Button>{withdrawOpen && <ConfirmDialog title="정말 탈퇴할까요?" description="작성한 게시글과 댓글은 '탈퇴한 사용자'로 표시돼요." confirmLabel="탈퇴" danger onClose={() => setWithdraw(false)} onConfirm={withdraw}/>}</AppShell>
}
