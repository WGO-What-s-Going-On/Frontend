import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Lock, ChevronDown, ChevronUp, MapPin, MoreHorizontal, Search, Send, X, Check, CircleAlert, SmilePlus, ThumbsUp } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterChips } from '../../components/ui/FilterChips'
import { IconButton } from '../../components/ui/IconButton'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import { isHotBoard } from '../../types/domain'
import type { Board, Category, Comment, CommentReaction } from '../../types/domain'
import { categoryLabel, commentReactions } from '../../domain/labels'
import { RADIUS } from '../map/mapWorld'
import { pathForScreen } from '../../navigation'
import { EditBoardSheet } from './EditBoardSheet'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']
type BoardSort = '거리' | '최신' | '활발' | '참여 가능'

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
    const filtered = boards.filter((board) => board.status !== '숨김' && (category === '전체' || board.category === category) && (sort !== '참여 가능' || board.distance <= 150 && board.status === '실시간'))
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

// 게시판 검색: "이 일에 대한 글이 이미 있나, 아직 진행 중인가"를 빨리 확인하는 화면.
// 입력 전에는 최근 검색과 지금 진행 중인 주변 소식, 입력하면 검색어와 잘 맞는 순서(제목 > 카테고리·본문) → 진행 중 → 가까운 순.
// 범위는 결과를 나누지 않고, 150m 밖 글에만 오른쪽에 작은 자물쇠로 표시한다.
const RECENT_SEARCH_KEY = 'wgo-recent-searches'
function readRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]') } catch { return [] }
}
function saveRecentSearches(items: string[]) {
  try { localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(items)) } catch { /* 저장 못 해도 검색은 된다 */ }
}

// 검색어와 같은 부분만 파랗게
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword) return <>{text}</>
  const at = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (at < 0) return <>{text}</>
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + keyword.length)}</mark>{text.slice(at + keyword.length)}</>
}

// 검색어와 얼마나 맞는지: 제목 2, 카테고리·본문 1, 없으면 0
function matchScore(board: Board, keyword: string) {
  const word = keyword.toLowerCase()
  if (board.title.toLowerCase().includes(word)) return 2
  return `${board.body} ${categoryLabel[board.category]}`.toLowerCase().includes(word) ? 1 : 0
}

function SearchRow({ board, keyword, commentCount, onOpen }: { board: Board; keyword: string; commentCount: number; onOpen: () => void }) {
  const ended = board.status !== '실시간'
  const outside = board.distance > RADIUS
  return <button className={`search-row ${ended ? 'ended' : ''}`} onClick={onOpen}>
    <span className="search-row-text">
      <span className="search-row-tags"><span className="search-row-category" data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, commentCount) && <b className="board-tag tag-hot">HOT</b>}{ended && <b className="board-tag tag-ended">종료</b>}</span>
      <strong><Highlight text={board.title} keyword={keyword}/></strong>
    </span>
    {outside && <Lock className="search-row-lock" size={14} aria-label="150m 밖, 열람만 가능"/>}
  </button>
}

export function SearchScreen() {
  const { boards, comments, openBoard } = useApp()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState(readRecentSearches)
  const keyword = query.trim()
  const visible = boards.filter((board) => board.status !== '숨김')
  const results = keyword ? visible
    .map((board) => ({ board, score: matchScore(board, keyword) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.board.status === '실시간') - Number(a.board.status === '실시간') || a.board.distance - b.board.distance)
    .map((item) => item.board) : []
  // 입력 전: 지금 진행 중인 주변 소식 (가까운 순)
  const live = visible.filter((board) => board.status === '실시간').sort((a, b) => a.distance - b.distance)
  const commentCount = (id: string) => comments.filter((comment) => comment.boardId === id).length
  const remember = (word: string) => {
    if (!word) return
    const next = [word, ...recent.filter((item) => item !== word)].slice(0, 8)
    setRecent(next); saveRecentSearches(next)
  }
  const removeRecent = (word: string) => { const next = recent.filter((item) => item !== word); setRecent(next); saveRecentSearches(next) }
  const list = (items: Board[]) => <div className="search-rows">{items.map((board) => <SearchRow key={board.id} board={board} keyword={keyword} commentCount={commentCount(board.id)} onOpen={() => { remember(keyword); openBoard(board.id) }}/>)}</div>
  return <AppShell contentClassName="search-screen">
    <form className="search-field" role="search" onSubmit={(event) => { event.preventDefault(); remember(keyword) }}>
      <Search size={17} aria-hidden="true"/>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소, 사건, 질문 검색" aria-label="게시판 검색" enterKeyHint="search" autoFocus/>
      {query && <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={12} strokeWidth={3}/></button>}
    </form>
    {!keyword ? <>
      {recent.length > 0 && <section className="search-section">
        <div className="search-section-head"><h4>최근 검색</h4><button className="search-clear-all" onClick={() => { setRecent([]); saveRecentSearches([]) }}>전체 삭제</button></div>
        <div className="search-recent">{recent.map((word) => <span key={word} className="search-recent-chip"><button onClick={() => setQuery(word)}>{word}</button><button className="search-recent-remove" onClick={() => removeRecent(word)} aria-label={`${word} 삭제`}><X size={12}/></button></span>)}</div>
      </section>}
      {live.length > 0 && <section className="search-section"><h4>지금 주변 소식</h4>{list(live)}</section>}
    </>
    : results.length > 0 ? list(results)
    : <div className="search-empty"><strong>'{keyword}' 관련 글이 아직 없어요</strong><p>지금 보고 있는 일이라면 먼저 알려주세요.</p></div>}
  </AppShell>
}

// 댓글 공감 아이콘 (카톡 반응처럼 아이콘 + 숫자로만 보여준다)
const commentReactionIcon: Record<CommentReaction, typeof ThumbsUp> = { '도움돼요': ThumbsUp, '맞아요': Check, '정보가 달라요': CircleAlert }

function CommentItem({ comment, replies = [], onReply, onEdit, isReply = false, replyTargetId, readOnly = false }: { comment: Comment; replies?: Comment[]; onReply: (comment: Comment) => void; onEdit: (comment: Comment) => void; isReply?: boolean; replyTargetId?: string; readOnly?: boolean }) {
  const { user, deleteComment, reportTarget, blockUser, reactToComment } = useApp()
  const [menu, setMenu] = useState<'actions' | 'report' | null>(null)
  const [picker, setPicker] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const press = useRef<{ x: number; y: number; timer: number } | null>(null)
  const longPressed = useRef(false)
  const reportReasons = ['부정확한 정보', '광고·홍보', '욕설·비방', '개인정보 노출']

  // 메뉴·공감 고르기 바깥을 누르면 닫는다. 이 댓글의 여는 버튼은 제외: 버튼 자체가 열고 닫기를 맡는다 (안 그러면 닫혔다가 바로 다시 열림)
  useEffect(() => {
    if (!menu && !picker) return
    const close = (event: PointerEvent) => {
      const target = event.target as Element
      if (menuRef.current?.contains(target) || pickerRef.current?.contains(target)) return
      const trigger = target.closest('.comment-icon-button, .comment-react-button')
      if (trigger && trigger.closest('.comment') === articleRef.current) return
      setMenu(null); setPicker(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu, picker])

  const openPicker = () => { setMenu(null); setPicker(true) }
  const react = (reaction: CommentReaction) => { reactToComment(comment.id, reaction); setPicker(false) }
  // 댓글을 꾹 누르면 (약 0.45초) 공감 고르기가 열린다
  const cancelPress = () => { if (press.current) window.clearTimeout(press.current.timer); press.current = null }
  const startPress = (event: React.PointerEvent) => {
    const target = event.target as Element
    if (readOnly || target.closest('.comment') !== event.currentTarget || target.closest('button, a, input, textarea, .context-menu')) return
    cancelPress()
    press.current = { x: event.clientX, y: event.clientY, timer: window.setTimeout(() => { longPressed.current = true; openPicker(); navigator.vibrate?.(8) }, 450) }
  }
  const movePress = (event: React.PointerEvent) => {
    if (press.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 8) cancelPress()
  }
  const reacted = commentReactions.filter((reaction) => comment.reactions[reaction] > 0 || comment.reactedByMe === reaction)

  return <article ref={articleRef} className={`comment comment-clickable ${isReply ? 'reply-comment' : ''} ${menu || picker ? 'comment-menu-open' : ''} ${replyTargetId === comment.id ? 'reply-target' : ''}`} tabIndex={0} aria-label={`${comment.authorName} 댓글에 댓글 작성`}
    onPointerDown={startPress} onPointerMove={movePress} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress}
    onContextMenu={(event) => { if (longPressed.current) event.preventDefault() }}
    onClick={(event) => { if (longPressed.current) { longPressed.current = false; return } const target = event.target as HTMLElement; if (target.closest('.comment') !== event.currentTarget || target.closest('button, a, input, textarea, select, .context-menu') || window.getSelection()?.toString()) return; event.stopPropagation(); onReply(comment) }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onReply(comment) } }}>
    <div className="comment-head"><div className="comment-identity"><div><strong>{comment.authorName}</strong><small>{comment.createdAt}{comment.edited && <span className="comment-edited">수정됨</span>}</small></div></div>
      <div className="comment-head-actions">{!readOnly && <IconButton className="comment-react-button" label="공감 남기기" onClick={() => picker ? setPicker(false) : openPicker()} expanded={picker}><SmilePlus size={17}/></IconButton>}<IconButton className="comment-icon-button" label="댓글 메뉴" onClick={() => { setPicker(false); setMenu(menu ? null : 'actions') }} expanded={Boolean(menu)}><MoreHorizontal size={18}/></IconButton></div>
    </div>
    {comment.body && <p>{comment.body}</p>}{comment.imagePlaceholder && <div className="comment-image-placeholder">[이미지]</div>}{comment.imageUrl && <button className="comment-photo" onClick={() => setPhotoOpen(true)} aria-label="댓글 사진 크게 보기"><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></button>}
    <div className="comment-actions">{reacted.map((reaction) => { const Icon = commentReactionIcon[reaction]; return <button key={reaction} className={`comment-reaction-chip ${comment.reactedByMe === reaction ? 'selected' : ''}`} onClick={() => reactToComment(comment.id, reaction)} disabled={readOnly} aria-pressed={comment.reactedByMe === reaction} aria-label={`${reaction} ${comment.reactions[reaction]}`}><Icon size={11} strokeWidth={2.4}/><b>{comment.reactions[reaction]}</b></button> })}{!readOnly && <button className="comment-reply-button" onClick={() => onReply(comment)}>답글 달기</button>}</div>
    {!isReply && replies.length > 0 && <div className="comment-replies">{replies.map((reply) => <CommentItem key={reply.id} comment={reply} onReply={onReply} onEdit={onEdit} isReply replyTargetId={replyTargetId} readOnly={readOnly}/>)}</div>}
    {picker && <div ref={pickerRef} className="context-menu comment-reaction-picker" role="menu" aria-label="공감 고르기">{commentReactions.map((reaction) => { const Icon = commentReactionIcon[reaction]; return <button key={reaction} role="menuitemradio" aria-checked={comment.reactedByMe === reaction} className={comment.reactedByMe === reaction ? 'selected' : ''} onClick={() => react(reaction)}><Icon size={20} strokeWidth={2}/><span>{reaction}</span></button> })}</div>}
    {menu && <div ref={menuRef} className={`context-menu comment-context-menu ${menu === 'report' ? 'comment-report-menu' : ''}`} role="menu" aria-label={menu === 'report' ? '댓글 신고 사유' : '댓글 메뉴'}>{comment.authorId === user.id ? <><button onClick={() => { onEdit(comment); setMenu(null) }}>수정</button><button onClick={() => deleteComment(comment.id)}>삭제</button></> : menu === 'actions' ? <><button onClick={() => setMenu('report')}>신고</button><button onClick={() => { blockUser(comment.authorId); setMenu(null) }}>차단</button></> : <><strong>신고 사유</strong>{reportReasons.map((reason) => <button key={reason} onClick={() => { reportTarget('댓글', comment.id, reason); setMenu(null) }}>{reason}</button>)}<button className="comment-report-back" onClick={() => setMenu('actions')}>뒤로</button></>}</div>}
    {photoOpen && comment.imageUrl && <div className="comment-photo-modal" role="dialog" aria-label="현장 사진 보기" onClick={() => setPhotoOpen(false)}><button aria-label="사진 닫기"><X size={22}/></button><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></div>}
  </article>
}


export function BoardDetailScreen() {
  // 다른 화면에서 게시글을 열고 들어왔을 때만 들어오는 애니메이션을 쓴다
  const entering = Boolean((useLocation().state as { enter?: boolean } | null)?.enter)
  const { screen, currentBoard: board, back, comments, user, go, inRange, locationPermission, reactToBoard, addComment, updateComment, deleteBoard, finishBoard, reportTarget, blockUser, blockedUsers } = useApp()
  const [body, setBody] = useState('')
  const [commentImageUrl, setCommentImageUrl] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [editing, setEditing] = useState<Comment | null>(null)
  const [menu, setMenu] = useState(false)
  const [visibleComments, setVisibleComments] = useState(3)
  const [confirm, setConfirm] = useState<'delete' | 'finish' | null>(null)
  // 예전 수정 주소(/boards/:id/edit)로 들어와도 상세 화면 위에 수정 시트를 연다
  const [editOpen, setEditOpen] = useState(screen === 'edit')
  const navigate = useNavigate()
  const closeEdit = () => { setEditOpen(false); if (screen === 'edit' && board) navigate(pathForScreen('detail', board.id), { replace: true }) }
  const commentFileRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  if (!board) return null
  const boardComments = comments.filter((comment) => comment.boardId === board.id && !blockedUsers.includes(comment.authorId))
  const submit = () => {
    if (!body.trim() && !commentImageUrl) return
    if (editing) { updateComment(editing.id, body.trim()); setEditing(null) }
    else { addComment(body.trim(), replyTo?.parentId || replyTo?.id, commentImageUrl || undefined); setReplyTo(null); setVisibleComments(boardComments.length + 1) }
    setBody(''); setCommentImageUrl('')
  }
  const addPhoto = (file?: File) => { if (file) setCommentImageUrl(URL.createObjectURL(file)) }
  const startComment = (comment: Comment) => { setEditing(null); setReplyTo(comment); requestAnimationFrame(() => commentInputRef.current?.focus()) }
  // 내 댓글 수정 (PST-F08): 입력창에 기존 내용을 넣고 수정 모드로
  const startEdit = (comment: Comment) => { setReplyTo(null); setEditing(comment); setBody(comment.body); requestAnimationFrame(() => commentInputRef.current?.focus()) }
  const cancelCompose = () => { setReplyTo(null); if (editing) { setEditing(null); setBody('') } }
  const rootComments = boardComments.filter((comment) => !comment.parentId)
  const shownComments = rootComments.slice(0, visibleComments)
  const remainingComments = rootComments.length - shownComments.length
  // 150m 밖이면 같은 상세 화면을 읽기 전용으로 보여준다 (MAP-F05)
  const outOfRange = !inRange || board.distance > RADIUS
  const canParticipate = !outOfRange && board.status === '실시간'
  const readOnlyBar = outOfRange ? <div className="outside-bottom"><div className="outside-readonly-bar"><Lock size={16}/><span>150m 안에서만 댓글 가능</span></div></div> : null
  const commentComposer = canParticipate ? <div className="detail-comment-input">{(replyTo || editing) && <div className="replying"><span>{editing ? '댓글 수정 중' : `${replyTo?.authorName}님에게 댓글 작성 중`}</span><button onClick={cancelCompose}>취소</button></div>}{commentImageUrl && <div className="comment-upload-preview"><img src={commentImageUrl} alt="첨부할 사진 미리보기"/><button onClick={() => setCommentImageUrl('')} aria-label="첨부 사진 삭제"><X size={16}/></button></div>}<div className="comment-composer-row"><IconButton className="comment-photo-add" label="댓글에 사진 첨부" onClick={() => commentFileRef.current?.click()}><Camera size={20}/></IconButton><input ref={commentInputRef} value={body} onChange={(event) => setBody(event.target.value)} placeholder="댓글을 입력하세요"/><IconButton className="comment-submit" label={editing ? '댓글 수정' : '댓글 등록'} onClick={submit} disabled={!body.trim() && !commentImageUrl}><Send size={19}/></IconButton></div><input ref={commentFileRef} className="comment-file-input" type="file" accept="image/*" onChange={(event) => addPhoto(event.target.files?.[0])}/></div> : null
  return <AppShell nav={false} contentClassName={`board-detail-screen ${entering ? 'detail-enter' : ''}`} shellClassName={entering ? 'detail-enter-shell' : ''} bottomContent={<>{commentComposer ?? readOnlyBar}
    {editOpen && <EditBoardSheet board={board} canEdit={!outOfRange} onClose={closeEdit}/>}
    {confirm === 'delete' && <ConfirmDialog title="게시글을 삭제할까요?" description="삭제한 게시글은 다시 볼 수 없어요." confirmLabel="삭제" danger onClose={() => setConfirm(null)} onConfirm={() => deleteBoard(board.id)}/>} 
    {confirm === 'finish' && <ConfirmDialog title="게시판을 종료할까요?" description="종료하면 더 이상 새 댓글과 반응을 받을 수 없어요." confirmLabel="종료" onClose={() => setConfirm(null)} onConfirm={() => { finishBoard(board.id); setConfirm(null) }}/>}
  </>}>
    <header className="detail-nav"><IconButton className="icon" label="뒤로 가기" onClick={() => back('board')}><ArrowLeft size={22}/></IconButton></header>
    {outOfRange && <p className="outside-notice">{board.distance <= RADIUS && locationPermission !== 'granted' ? '위치 권한이 꺼져 있어 읽기만 할 수 있어요' : '읽기 전용 · 범위 밖'}</p>}
    <article className="detail-article">
      <div className="detail-title-row"><h1 title={board.title}>{board.title}</h1><span className="detail-title-menu-wrap"><IconButton className="detail-title-menu" label="게시글 메뉴" onClick={() => setMenu(!menu)} expanded={menu}><MoreHorizontal size={18}/></IconButton>{menu && <div className="context-menu detail-menu">{board.authorId === user.id ? <><button onClick={() => { setEditOpen(true); setMenu(false) }}>수정</button><button onClick={() => { setConfirm('finish'); setMenu(false) }}>종료</button><button onClick={() => { setConfirm('delete'); setMenu(false) }}>삭제</button></> : <><button onClick={() => { reportTarget('게시글', board.id, '허위 또는 부적절한 정보'); setMenu(false) }}>신고</button><button onClick={() => { blockUser(board.authorId); setMenu(false) }}>차단</button></>}</div>}</span></div>
      <div className="detail-byline"><strong>{board.authorName}</strong><span>{board.createdAt}</span>{board.edited && <span className="detail-edited">수정됨</span>}<span><MapPin size={12}/>{board.distance}m</span></div>
      <p className="detail-body">{board.body}</p>
      {board.imageName && <div className="attachment">첨부 이미지: {board.imageName}</div>}
      <div className="detail-inline-reactions"><PostReactions board={board} interactive={canParticipate} fullLabels onReact={(reaction) => reactToBoard(board.id, reaction)}/></div>
    </article>
    <section className="comments-section"><div className="comments-heading"><h3>댓글</h3><span>{boardComments.length}</span></div>{rootComments.length ? shownComments.map((comment) => <CommentItem key={comment.id} comment={comment} replies={boardComments.filter((reply) => reply.parentId === comment.id)} onReply={canParticipate ? startComment : () => undefined} onEdit={startEdit} replyTargetId={replyTo?.id} readOnly={!canParticipate}/>) : <div className="comments-empty"><strong>아직 댓글이 없습니다</strong>{canParticipate && <p>가장 먼저 상황을 알려주세요</p>}</div>}{remainingComments > 0 && <button className="comments-more" onClick={() => setVisibleComments((count) => count + 3)}>댓글 {remainingComments}개 더 보기 <ChevronDown size={17}/></button>}{rootComments.length > 3 && remainingComments === 0 && <button className="comments-more" onClick={() => setVisibleComments(3)}>접기 <ChevronUp size={17}/></button>}</section>
  </AppShell>
}

// 게시글 수정 (작성은 하단 작성 버튼의 빠른 작성 시트에서 한다)

