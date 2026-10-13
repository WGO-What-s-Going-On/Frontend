import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, ChevronDown, ChevronRight, ChevronUp, MapPin, MoreHorizontal, Search, Send, TriangleAlert, X } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterChips } from '../../components/ui/FilterChips'
import { HeartIcon } from '../../components/ui/HeartIcon'
import { IconButton } from '../../components/ui/IconButton'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import { isOpenBoard } from '../../types/domain'
import type { Category, Comment } from '../../types/domain'
import { categoryLabel } from '../../domain/labels'
import { AuthorToggle, nearbyRange, readImage, usePublishGuard } from './WriteGuards'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']
type BoardSort = '거리' | '최신' | '활발' | '참여 가능'
// 게시판 신고 사유 (MOD-F01)
const boardReportReasons = ['허위 정보', '욕설', '개인정보 노출', '혐오 표현', '폭력적인 내용', '피해자 특정']
const commentReportReasons = ['부정확한 정보', '광고·홍보', '욕설·비방', '개인정보 노출']

export function BoardListScreen() {
  const { boards, comments, go, openBoard, alertBoardIds, toggleBoardNotifications } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const sortOptions: BoardSort[] = ['거리', '최신', '활발', '참여 가능']
  const categoryOptions: (Category | '전체')[] = ['전체', '긴급 사고', '도움 요청', '동네 소식', '일상 불편']
  const sortValue = searchParams.get('sort') as BoardSort | null
  const categoryValue = searchParams.get('category') as Category | '전체' | null
  const sort = sortValue && sortOptions.includes(sortValue) ? sortValue : '거리'
  const category = categoryValue && categoryOptions.includes(categoryValue) ? categoryValue : '전체'
  const updateFilter = (key: 'sort' | 'category', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === (key === 'sort' ? '거리' : '전체')) next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }
  const visibleBoards = useMemo(() => {
    const filtered = boards.filter((board) => board.status !== '숨김' && (category === '전체' || board.category === category) && (sort !== '참여 가능' || board.distance <= 150 && isOpenBoard(board)))
    return [...filtered].sort((a, b) => sort === '거리' || sort === '참여 가능' ? a.distance - b.distance : sort === '활발' ? Object.values(b.reactions).reduce((x, y) => x + y, 0) - Object.values(a.reactions).reduce((x, y) => x + y, 0) : b.id.localeCompare(a.id))
  }, [boards, category, sort])
  useEffect(() => {
    if (!sortMenuOpen) return
    const closeMenu = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) setSortMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [sortMenuOpen])
  return <AppShell contentClassName="ux-board-screen">
    <header className="ux-board-header"><h1>게시판</h1><div ref={sortMenuRef} className="ux-sort-filter"><button className="ux-sort-trigger" onClick={() => setSortMenuOpen((open) => !open)} aria-label="게시글 정렬" aria-haspopup="menu" aria-expanded={sortMenuOpen}><span>{sort}</span><ChevronDown size={14}/></button>{sortMenuOpen && <div className="ux-sort-menu" role="menu">{sortOptions.map((item) => <button key={item} role="menuitemradio" aria-checked={sort === item} onClick={() => { updateFilter('sort', item); setSortMenuOpen(false) }}>{item}</button>)}</div>}</div></header>
    <div className="ux-filter-row"><FilterChips className="ux-category-filters" options={categoryOptions.map((item) => ({ value: item, label: item === '전체' ? '전체' : categoryLabel[item] }))} selected={category} onSelect={(item) => updateFilter('category', item)}/><IconButton className="board-search-chip" label="게시판 검색" onClick={() => go('search')}><Search size={17}/></IconButton></div>
    <div className="ux-board-list">{visibleBoards.length ? visibleBoards.map((board) => <BoardCard key={board.id} board={board} commentCount={comments.filter((comment) => comment.boardId === board.id).length} notificationsMuted={!alertBoardIds.includes(board.id)} onToggleNotifications={() => toggleBoardNotifications(board.id)} onOpen={() => openBoard(board.id)}/>) : <EmptyState title="조건에 맞는 게시판이 없습니다." action="전체 게시글 보기" onAction={() => updateFilter('category', '전체')}/>}</div>
  </AppShell>
}

export function SearchScreen() {
  const { boards, comments, back, openBoard } = useApp()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'150m 안' | '근처 요약' | '전체 핀'>('150m 안')
  const results = boards.filter((board) => board.status !== '숨김' && (!query || `${board.title} ${board.body} ${categoryLabel[board.category]}`.includes(query)))
  return <AppShell>
    <div className="search-input"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소, 사건, 질문 검색" autoFocus/><button onClick={() => query ? setQuery('') : back('board')}><X size={18}/></button></div>
    <h4>열람 범위</h4><div className="segment">{(['150m 안', '근처 요약', '전체 핀'] as const).map((item) => <button key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item}</button>)}</div>
    <h4>검색 결과 <small>{results.length}</small></h4><div className="post-list">{results.map((board) => <BoardCard key={board.id} board={board} commentCount={comments.filter((comment) => comment.boardId === board.id).length} onOpen={() => openBoard(board.id)}/>)}</div>
  </AppShell>
}

function PhotoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return <div className="comment-photo-modal" role="dialog" aria-label="현장 사진 보기" onClick={onClose}><button aria-label="사진 닫기"><X size={22}/></button><img src={src} alt="첨부된 현장 사진"/></div>
}

function CommentItem({ comment, replies = [], onReply, onEdit, isReply = false, replyTargetId }: { comment: Comment; replies?: Comment[]; onReply: (comment: Comment) => void; onEdit: (comment: Comment) => void; isReply?: boolean; replyTargetId?: string }) {
  const { user, deleteComment, reportTarget, blockUser, toggleCommentLike } = useApp()
  const [menu, setMenu] = useState<'actions' | 'report' | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [menu])

  return <article id={`comment-${comment.id}`} className={`comment comment-clickable ${isReply ? 'reply-comment' : ''} ${menu ? 'comment-menu-open' : ''} ${replyTargetId === comment.id ? 'reply-target' : ''}`} tabIndex={0} aria-label={`${comment.authorName} 댓글에 댓글 작성`} onClick={(event) => { const target = event.target as HTMLElement; if (target.closest('.comment') !== event.currentTarget || target.closest('button, a, input, textarea, select, .context-menu') || window.getSelection()?.toString()) return; event.stopPropagation(); onReply(comment) }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onReply(comment) } }}>
    <div className="comment-head"><div className="comment-identity"><div><strong>{comment.authorName}</strong><small>{comment.createdAt}{comment.edited && <span className="comment-edited">수정됨</span>}</small></div></div><IconButton className="comment-icon-button" label="댓글 메뉴" onClick={() => setMenu(menu ? null : 'actions')} expanded={Boolean(menu)}><MoreHorizontal size={18}/></IconButton></div>
    {comment.body && <p>{comment.body}</p>}{comment.imagePlaceholder && <div className="comment-image-placeholder">[이미지]</div>}{comment.imageUrl && <button className="comment-photo" onClick={() => setPhotoOpen(true)} aria-label="댓글 사진 크게 보기"><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></button>}
    <div className="comment-actions"><button className={`comment-like ${comment.likedByMe ? 'liked' : ''}`} onClick={() => toggleCommentLike(comment.id)} aria-label={`좋아요 ${comment.likes ?? 0}개`} aria-pressed={Boolean(comment.likedByMe)}><HeartIcon size={17} filled={comment.likedByMe}/><span>{comment.likes ?? 0}</span></button><button className="comment-reply-button" onClick={() => onReply(comment)}>답글 달기</button></div>
    {!isReply && replies.length > 0 && <div className="comment-replies">{replies.map((reply) => <CommentItem key={reply.id} comment={reply} onReply={onReply} onEdit={onEdit} isReply replyTargetId={replyTargetId}/>)}</div>}
    {menu && <div ref={menuRef} className={`context-menu comment-context-menu ${menu === 'report' ? 'comment-report-menu' : ''}`} role="menu" aria-label={menu === 'report' ? '댓글 신고 사유' : '댓글 메뉴'}>{comment.authorId === user.id ? <><button onClick={() => { onEdit(comment); setMenu(null) }}>댓글 수정</button><button onClick={() => deleteComment(comment.id)}>댓글 삭제</button></> : menu === 'actions' ? <><button onClick={() => setMenu('report')}>댓글 신고</button><button onClick={() => { blockUser(comment.authorId); setMenu(null) }}>사용자 차단</button></> : <><strong>신고 사유</strong>{commentReportReasons.map((reason) => <button key={reason} onClick={() => { reportTarget('댓글', comment.id, reason); setMenu(null) }}>{reason}</button>)}<button className="comment-report-back" onClick={() => setMenu('actions')}>뒤로</button></>}</div>}
    {photoOpen && comment.imageUrl && <PhotoModal src={comment.imageUrl} onClose={() => setPhotoOpen(false)}/>}
  </article>
}

export function BoardDetailScreen() {
  const { currentBoard: board, back, comments, user, go, inRange, locationPermission, reactToBoard, addComment, updateComment, deleteBoard, finishBoard, resolveBoard, reportTarget, blockUser, blockedUsers, focusCommentId, clearFocusComment } = useApp()
  const { guard, dialog } = usePublishGuard()
  const [body, setBody] = useState('')
  const [commentImageUrl, setCommentImageUrl] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [editing, setEditing] = useState<Comment | null>(null)
  const [menu, setMenu] = useState<'actions' | 'report' | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [visibleComments, setVisibleComments] = useState(3)
  const [confirm, setConfirm] = useState<'delete' | 'finish' | 'resolve' | null>(null)
  const commentFileRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const boardComments = board ? comments.filter((comment) => comment.boardId === board.id && !blockedUsers.includes(comment.authorId)) : []
  const rootComments = boardComments.filter((comment) => !comment.parentId)

  // 알림에서 들어왔으면 해당 댓글까지 스크롤하고 잠깐 표시한다 (NTF-F01)
  useEffect(() => {
    if (!focusCommentId) return
    const target = comments.find((comment) => comment.id === focusCommentId)
    const rootIndex = rootComments.findIndex((comment) => comment.id === (target?.parentId ?? focusCommentId))
    if (rootIndex >= visibleComments) { setVisibleComments(rootIndex + 1); return }
    const element = document.getElementById(`comment-${focusCommentId}`)
    if (element) {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' })
      element.classList.add('comment-focus')
      window.setTimeout(() => element.classList.remove('comment-focus'), 1600)
    }
    clearFocusComment()
  }, [focusCommentId, visibleComments])

  if (!board) return null
  const open = isOpenBoard(board)
  const canParticipate = inRange && open
  const statusLabel = board.status === '실시간' ? '진행 중' : board.status
  const submit = () => {
    const text = body.trim()
    if (!text && !commentImageUrl) return
    guard(text, undefined, () => {
      if (editing) { updateComment(editing.id, text); setEditing(null) }
      else { addComment(text, replyTo?.parentId || replyTo?.id, commentImageUrl || undefined); setReplyTo(null); setVisibleComments(boardComments.length + 1) }
      setBody(''); setCommentImageUrl('')
    })
  }
  const addPhoto = (file?: File) => { if (file) setCommentImageUrl(URL.createObjectURL(file)) }
  const startComment = (comment: Comment) => { setEditing(null); setReplyTo(comment); requestAnimationFrame(() => commentInputRef.current?.focus()) }
  const startEdit = (comment: Comment) => { setReplyTo(null); setEditing(comment); setBody(comment.body); requestAnimationFrame(() => commentInputRef.current?.focus()) }
  const cancelCompose = () => { setReplyTo(null); if (editing) { setEditing(null); setBody('') } }
  const shownComments = rootComments.slice(0, visibleComments)
  const remainingComments = rootComments.length - shownComments.length
  const composeTarget = editing ? '댓글 수정 중' : replyTo ? `${replyTo.authorName}님에게 댓글 작성 중` : ''
  const commentComposer = canParticipate ? <div className="detail-comment-input">{composeTarget && <div className="replying"><span>{composeTarget}</span><button onClick={cancelCompose}>취소</button></div>}{commentImageUrl && <div className="comment-upload-preview"><img src={commentImageUrl} alt="첨부할 사진 미리보기"/><button onClick={() => setCommentImageUrl('')} aria-label="첨부 사진 삭제"><X size={16}/></button></div>}<div className="comment-composer-row"><IconButton className="comment-photo-add" label="댓글에 사진 첨부" onClick={() => commentFileRef.current?.click()} disabled={Boolean(editing)}><Camera size={20}/></IconButton><input ref={commentInputRef} value={body} onChange={(event) => setBody(event.target.value)} placeholder="댓글을 입력하세요"/><IconButton className="comment-submit" label={editing ? '댓글 수정' : '댓글 등록'} onClick={submit} disabled={!body.trim() && !commentImageUrl}><Send size={19}/></IconButton></div><input ref={commentFileRef} className="comment-file-input" type="file" accept="image/*" onChange={(event) => addPhoto(event.target.files?.[0])}/></div> : null
  const closeMenu = () => setMenu(null)
  return <AppShell nav={false} contentClassName="board-detail-screen" bottomContent={<>{commentComposer}{dialog}</>}>
    <header className="detail-nav"><IconButton className="icon" label="뒤로 가기" onClick={() => back('board')}><ArrowLeft size={22}/></IconButton></header>
    <article className="detail-article">
      <div className="detail-title-row"><h1 title={board.title}>{board.title}</h1><span className="detail-title-menu-wrap"><IconButton className="detail-title-menu" label="게시글 메뉴" onClick={() => setMenu(menu ? null : 'actions')} expanded={Boolean(menu)}><MoreHorizontal size={18}/></IconButton>{menu && <div className="context-menu detail-menu">{board.authorId === user.id ? <><button onClick={() => go('edit')}>게시글 수정</button>{open && <button onClick={() => { setConfirm('resolve'); closeMenu() }}>해결됐어요 표시</button>}{open && <button onClick={() => { setConfirm('finish'); closeMenu() }}>게시판 종료</button>}<button onClick={() => { setConfirm('delete'); closeMenu() }}>게시글 삭제</button></> : menu === 'actions' ? <><button onClick={() => setMenu('report')}>게시글 신고</button><button onClick={() => { blockUser(board.authorId); closeMenu() }}>작성자 차단</button></> : <><strong className="menu-heading">신고 사유</strong>{boardReportReasons.map((reason) => <button key={reason} onClick={() => { reportTarget('게시글', board.id, reason); closeMenu() }}>{reason}</button>)}</>}</div>}</span></div>
      <div className="detail-byline"><strong>{board.authorName}</strong><span>{board.createdAt}</span>{board.edited && <span className="detail-edited">수정됨</span>}<span><MapPin size={12}/>{board.distance}m</span></div>
      <div className="detail-meta"><span>조회 {board.views}</span><span className={`detail-status status-${open ? 'open' : 'closed'}`}>{statusLabel}</span><span className={canParticipate ? 'can-join' : 'read-only'}>{canParticipate ? '참여 가능' : '열람만 가능'}</span></div>
      {board.category === '긴급 사고' && open && <div className="detail-caution" role="note"><TriangleAlert size={16}/><span>사고·재난 상황이에요. 현장에 가까이 가지 말고 119·112 신고를 먼저 해 주세요.</span></div>}
      <p className="detail-body">{board.body}</p>
      {board.imageUrl ? <button className="detail-photo" onClick={() => setPhotoOpen(true)} aria-label="첨부 사진 크게 보기"><img src={board.imageUrl} alt="게시글에 첨부된 현장 사진"/></button> : board.imageName && <div className="attachment">첨부 이미지: {board.imageName}</div>}
      <div className="detail-inline-reactions"><PostReactions board={board} interactive={canParticipate} fullLabels onReact={(reaction) => reactToBoard(board.id, reaction)}/></div>
    </article>
    {!open && <div className="notice-box"><strong>{board.status === '해결됨' ? '해결된 게시판이에요.' : board.status === '숨김' ? '운영 정책에 따라 숨김 처리된 게시판이에요.' : '종료된 게시판이에요.'}</strong><p>새 댓글과 반응은 남길 수 없어요.</p></div>}
    {open && !inRange && <div className="notice-box"><strong>{locationPermission === 'granted' ? '150m 밖에서는 열람만 가능합니다.' : '위치 권한이 꺼져 있어 열람만 가능해요.'}</strong>{locationPermission !== 'granted' && <button className="text-link" onClick={() => go('location-permission')}>위치 권한 켜기</button>}</div>}
    <section className="comments-section"><div className="comments-heading"><h3>댓글</h3><span>{boardComments.length}</span></div>{rootComments.length ? shownComments.map((comment) => <CommentItem key={comment.id} comment={comment} replies={boardComments.filter((reply) => reply.parentId === comment.id)} onReply={startComment} onEdit={startEdit} replyTargetId={replyTo?.id}/>) : <div className="comments-empty"><strong>아직 댓글이 없습니다</strong><p>가장 먼저 상황을 알려주세요</p></div>}{remainingComments > 0 && <button className="comments-more" onClick={() => setVisibleComments((count) => count + 3)}>댓글 {remainingComments}개 더 보기 <ChevronDown size={17}/></button>}{rootComments.length > 3 && remainingComments === 0 && <button className="comments-more" onClick={() => setVisibleComments(3)}>접기 <ChevronUp size={17}/></button>}</section>
    {photoOpen && board.imageUrl && <PhotoModal src={board.imageUrl} onClose={() => setPhotoOpen(false)}/>}
    {confirm === 'delete' && <ConfirmDialog title="게시글을 삭제할까요?" description="목업에서는 즉시 목록에서 제거됩니다." confirmLabel="삭제" danger onClose={() => setConfirm(null)} onConfirm={() => deleteBoard(board.id)}/>}
    {confirm === 'finish' && <ConfirmDialog title="게시판을 종료할까요?" description="종료 후에는 새 댓글과 반응을 작성할 수 없습니다." confirmLabel="종료" onClose={() => setConfirm(null)} onConfirm={() => { finishBoard(board.id); setConfirm(null) }}/>}
    {confirm === 'resolve' && <ConfirmDialog title="상황이 해결됐나요?" description="해결된 게시판으로 표시되고, 새 댓글과 반응은 받지 않아요." confirmLabel="해결됐어요" onClose={() => setConfirm(null)} onConfirm={() => { resolveBoard(board.id); setConfirm(null) }}/>}
  </AppShell>
}

export function CategoryScreen() {
  const { go } = useApp()
  return <AppShell><h1>상황 카테고리 선택</h1><p className="muted">게시글 성격에 맞는 카테고리를 선택하세요.</p>{categories.map((category) => <button key={category} className="category" onClick={() => { sessionStorage.setItem('wgo-category', category); go('create') }}><span><strong>{categoryLabel[category]}</strong><small>{category === '긴급 사고' ? '화재, 붕괴, 사고와 같은 긴급 상황' : category === '도움 요청' ? '길 찾기, 분실물 등 현장 도움' : category === '동네 소식' ? '행사, 나눔, 주변 소식' : '정전, 소음 등 일상 상황'}</small></span><ChevronRight/></button>)}</AppShell>
}

function BoardForm({ mode }: { mode: 'create' | 'edit' }) {
  const { currentBoard, createBoard, updateBoard, go, inRange, nearbyUserCount } = useApp()
  const { guard, dialog } = usePublishGuard()
  const savedCategory = sessionStorage.getItem('wgo-category') as Category | null
  const editing = mode === 'edit' ? currentBoard : undefined
  const [category, setCategory] = useState<Category>(editing ? editing.category : savedCategory || '긴급 사고')
  const [title, setTitle] = useState(editing?.title || '')
  const [body, setBody] = useState(editing?.body || '')
  const [anonymous, setAnonymous] = useState(Boolean(editing?.anonymous))
  const [image, setImage] = useState<{ name?: string; url?: string } | undefined>(editing?.imageUrl || editing?.imageName ? { name: editing.imageName, url: editing.imageUrl } : undefined)
  if (!inRange) return <AppShell><BackHeader title="게시판 작성" onBack={() => go('board')}/><EmptyState title="150m 밖에서는 게시판을 작성할 수 없습니다." action="지도로 돌아가기" onAction={() => go('home')}/></AppShell>
  const submit = () => {
    if (!title.trim() || !body.trim()) return
    const text = `${title.trim()} ${body.trim()}`
    if (editing) guard(text, undefined, () => updateBoard(editing.id, { title: title.trim(), body: body.trim(), category, imageName: image?.name, imageUrl: image?.url }))
    else guard(text, category, () => createBoard({ title: title.trim(), body: body.trim(), category, imageName: image?.name, imageUrl: image?.url, anonymous }))
  }
  const pickImage = async (file?: File) => { if (file) setImage({ name: file.name, url: await readImage(file) }) }
  return <AppShell bottomContent={dialog}><BackHeader title={mode === 'edit' ? '게시글 수정' : '게시판 만들기'} onBack={() => go(mode === 'edit' ? 'detail' : 'category')}/><div className="live-card"><small>현재 위치 150m 안</small><strong>참여 가능 {nearbyRange(nearbyUserCount)}</strong><p>정확한 상세 위치는 다른 사용자에게 공개되지 않습니다.</p></div><label>카테고리</label><select className="field" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((item) => <option key={item} value={item}>{categoryLabel[item]}</option>)}</select><label>제목</label><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="무슨 일이 궁금한가요?" maxLength={50}/><small className="counter">{title.length}/50</small><label>상황 설명</label><textarea className="field" value={body} onChange={(event) => setBody(event.target.value)} placeholder="확인한 사실과 궁금한 점을 적어주세요." maxLength={500}/><label className="file-field">현장 사진 첨부<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickImage(event.target.files?.[0])}/></label>{image?.url ? <div className="write-photo-preview"><img src={image.url} alt="첨부할 현장 사진"/><IconButton className="write-photo-remove" label="첨부 사진 삭제" onClick={() => setImage(undefined)}><X size={16}/></IconButton></div> : image?.name && <div className="attachment">{image.name}<button onClick={() => setImage(undefined)}>삭제</button></div>}{!editing && <div className="write-author-row"><span>작성자 표시</span><AuthorToggle anonymous={anonymous} onChange={setAnonymous}/></div>}<Button className="primary" onClick={submit} disabled={!title.trim() || !body.trim()}>{mode === 'edit' ? '수정 저장' : '게시판 열기'}</Button></AppShell>
}

export function CreateBoardScreen() { return <BoardForm mode="create"/> }
export function EditBoardScreen() { return <BoardForm mode="edit"/> }
