import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, CircleAlert, LayoutGrid, Lock, ChevronDown, ChevronUp, MapPin, MoreHorizontal, Search, Send, SmilePlus, StretchHorizontal, ThumbsUp, X } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { NoticeBell } from '../../components/ui/NoticeBell'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import { isHotBoard, myCommentReactions } from '../../types/domain'
import type { Board, Category, Comment, CommentReaction } from '../../types/domain'
import { categoryLabel } from '../../domain/labels'
import { RADIUS } from '../map/mapWorld'
import { pathForScreen } from '../../navigation'
import { EditBoardSheet } from './EditBoardSheet'
import { FeedItem } from './FeedItem'
import { AlbumTile } from './AlbumTile'
import { CommentVoteSection } from './CommentVoteSection'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']
type BoardSort = '거리' | '최신' | '활발' | '참여 가능'
const sortLabel: Record<BoardSort, string> = { '거리': '거리순', '최신': '최신순', '활발': '활발순', '참여 가능': '참여 가능' }
// 게시판 보기 방식: 피드(기본, 본문·사진·반응을 펼쳐 읽기) · 앨범(한 줄에 2칸, 한눈에 훑기). 마지막으로 고른 방식을 기억한다
type BoardView = 'feed' | 'album'
const BOARD_VIEW_KEY = 'wgo-board-view'
function readBoardView(): BoardView {
  try { return localStorage.getItem(BOARD_VIEW_KEY) === 'album' ? 'album' : 'feed' } catch { return 'feed' }
}

export function BoardListScreen() {
  const { boards, comments, blockedUsers, inRange, go, openBoard } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState(readBoardView)
  const switchView = (next: BoardView) => {
    if (next === view) return
    setView(next)
    try { localStorage.setItem(BOARD_VIEW_KEY, next) } catch { /* 기억 못 해도 전환은 된다 */ }
    document.querySelector('.screen')?.scrollTo({ top: 0 })
  }
  const [sortMenuLeft, setSortMenuLeft] = useState<number | null>(null) // 열려 있으면 메뉴의 left(px): 정렬 칩 바로 아래
  const filterRowRef = useRef<HTMLDivElement>(null)
  const sortChipRef = useRef<HTMLButtonElement>(null)
  const sortOptions: BoardSort[] = ['거리', '최신', '활발', '참여 가능']
  const categoryOptions: (Category | '전체')[] = ['전체', '긴급 사고', '도움 요청', '동네 소식', '일상 불편']
  const sortValue = searchParams.get('sort')
  const categoryValue = searchParams.get('category') as Category | '전체' | null
  const sort = sortOptions.find((item) => item === sortValue) ?? '거리'
  const category = categoryValue && categoryOptions.includes(categoryValue) ? categoryValue : '전체'
  const updateFilter = (key: 'sort' | 'category', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === (key === 'sort' ? '거리' : '전체')) next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }
  const visibleBoards = useMemo(() => {
    // 종료한 게시판은 게시판 목록에서 빼고, 마이 > 최근 활동에서만 본다
    const filtered = boards.filter((board) => board.status === '실시간' && (category === '전체' || board.category === category) && (sort !== '참여 가능' || board.distance <= RADIUS))
    return [...filtered].sort((a, b) => sort === '거리' || sort === '참여 가능' ? a.distance - b.distance : sort === '활발' ? Object.values(b.reactions).reduce((x, y) => x + y, 0) - Object.values(a.reactions).reduce((x, y) => x + y, 0) : b.id.localeCompare(a.id))
  }, [boards, category, sort])
  useEffect(() => {
    if (sortMenuLeft === null) return
    const closeMenu = (event: PointerEvent) => {
      if (!filterRowRef.current?.contains(event.target as Node) || (event.target as Element).closest('.ux-category-filters > :not(.sort-chip)')) setSortMenuLeft(null)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [sortMenuLeft])
  const toggleSortMenu = () => {
    const chip = sortChipRef.current?.getBoundingClientRect()
    const row = filterRowRef.current?.getBoundingClientRect()
    setSortMenuLeft(sortMenuLeft !== null || !chip || !row ? null : chip.left - row.left)
  }
  return <AppShell contentClassName={`ux-board-screen ${view === 'feed' ? 'feed-screen' : ''}`}>
    {/* 제목 옆 보기 전환: 두 방식을 나란히 두고 지금 보는 쪽만 파랗게 */}
    <header className="ux-board-header"><h1>게시판</h1><div className="board-view-switch" role="radiogroup" aria-label="보기 방식">{([['feed', '피드로 보기', StretchHorizontal], ['album', '앨범으로 보기', LayoutGrid]] as const).map(([value, label, Icon]) => <button key={value} role="radio" aria-checked={view === value} aria-label={label} className={view === value ? 'selected' : ''} onClick={() => switchView(value)}><Icon size={17}/></button>)}</div><NoticeBell/></header>
    {/* 거르기는 한 줄 칩으로: [정렬 ▾] 카테고리 … 오른쪽 끝 검색. 정렬 메뉴는 옆으로 밀리는 칩 줄 밖에 띄워 잘리지 않게 */}
    <div ref={filterRowRef} className="ux-filter-row board-filter-row">
      <div className="ux-category-filters" onScroll={() => setSortMenuLeft(null)}>
        <button ref={sortChipRef} className="sort-chip" onClick={toggleSortMenu} aria-label={`정렬: ${sortLabel[sort]}`} aria-haspopup="menu" aria-expanded={sortMenuLeft !== null}>{sortLabel[sort]}<ChevronDown size={14}/></button>
        {categoryOptions.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => updateFilter('category', item)}>{item === '전체' ? '전체' : categoryLabel[item]}</button>)}
      </div>
      <IconButton className="board-search-chip" label="게시판 검색" onClick={() => go('search')}><Search size={17}/></IconButton>
      {sortMenuLeft !== null && <div className="ux-sort-menu" role="menu" style={{ left: sortMenuLeft }}>{sortOptions.map((item) => <button key={item} role="menuitemradio" aria-checked={sort === item} onClick={() => { updateFilter('sort', item); setSortMenuLeft(null) }}>{sortLabel[item]}</button>)}</div>}
    </div>
    {!visibleBoards.length ? <EmptyState title="조건에 맞는 게시판이 없습니다." action="전체 게시글 보기" onAction={() => setSearchParams(new URLSearchParams())}/>
      : view === 'feed' ? <div className="feed-list">{visibleBoards.map((board) => <FeedItem key={board.id} board={board} comments={comments.filter((comment) => comment.boardId === board.id && !blockedUsers.includes(comment.authorId))}/>)}</div>
      : <div className="album-grid">{visibleBoards.map((board) => <AlbumTile key={board.id} board={board} commentCount={comments.filter((comment) => comment.boardId === board.id).length} readOnly={!inRange || board.distance > RADIUS} onOpen={() => openBoard(board.id)}/>)}</div>}
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

// 댓글 공감: 오른쪽 위 작은 상자 [공감 | ⋯]에서 공감을 고르면, 고른 공감이 댓글 아래 파란 테두리로 붙는다
const commentReactionList: CommentReaction[] = ['도움돼요', '맞아요', '정보가 달라요']
const commentReactionIcon: Record<CommentReaction, typeof ThumbsUp> = { '도움돼요': ThumbsUp, '맞아요': Check, '정보가 달라요': CircleAlert }

function CommentItem({ comment, replies = [], onReply, onEdit, isReply = false, replyTargetId, readOnly = false }: { comment: Comment; replies?: Comment[]; onReply: (comment: Comment) => void; onEdit: (comment: Comment) => void; isReply?: boolean; replyTargetId?: string; readOnly?: boolean }) {
  const { user, deleteComment, reportTarget, blockUser, reactToComment } = useApp()
  const [menu, setMenu] = useState<'actions' | 'report' | null>(null)
  const [picker, setPicker] = useState<number | null>(null) // 열려 있으면 판의 top(px): [공감 | ⋯] 상자 바로 아래
  const pickerRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const reportReasons = ['부정확한 정보', '광고·홍보', '욕설·비방', '개인정보 노출']

  useEffect(() => {
    if (!menu && !picker) return
    // 메뉴·공감 판 바깥을 누르면 닫는다. 이 댓글의 여는 버튼은 제외: 버튼 자체가 열고 닫기를 맡는다 (안 그러면 닫혔다가 바로 다시 열림)
    const closeMenu = (event: PointerEvent) => {
      const target = event.target as Element
      if (menuRef.current?.contains(target) || pickerRef.current?.contains(target)) return
      const trigger = target.closest('.comment-icon-button, .comment-react-button')
      if (trigger && trigger.closest('.comment') === articleRef.current) return
      setMenu(null); setPicker(null)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [menu, picker])
  const mine = myCommentReactions(comment)
  // 받은 공감은 늘 회색으로 보여주고, 내가 누른 것만 파랗게 (누르면 숫자가 1 오르고 파래진다)
  const shownReactions = commentReactionList.filter((reaction) => comment.reactions[reaction] > 0 || mine.includes(reaction))

  return <article ref={articleRef} className={`comment comment-clickable ${isReply ? 'reply-comment' : ''} ${menu || picker !== null ? 'comment-menu-open' : ''} ${replyTargetId === comment.id ? 'reply-target' : ''}`} tabIndex={0} aria-label={`${comment.authorName} 댓글에 댓글 작성`} onClick={(event) => { const target = event.target as HTMLElement; if (target.closest('.comment') !== event.currentTarget || target.closest('button, a, input, textarea, select, .context-menu') || window.getSelection()?.toString()) return; event.stopPropagation(); onReply(comment) }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onReply(comment) } }}>
    <div className="comment-head"><div className="comment-identity"><div><strong>{comment.authorName}</strong>{shownReactions.length > 0 && <span className="comment-reactions">{shownReactions.map((reaction) => { const Icon = commentReactionIcon[reaction]; const pressed = mine.includes(reaction); return <button key={reaction} className={`comment-reaction-chip ${pressed ? 'mine' : ''}`} onClick={() => reactToComment(comment.id, reaction)} disabled={readOnly} aria-pressed={pressed} aria-label={`${reaction} ${comment.reactions[reaction]}`}><Icon size={12} strokeWidth={2.4}/>{comment.reactions[reaction]}</button> })}</span>}</div></div><div ref={toolsRef} className="comment-tools">{!readOnly && <><IconButton className="comment-react-button" label="공감 남기기" onClick={() => { setMenu(null); const tools = toolsRef.current?.getBoundingClientRect(); const article = articleRef.current?.getBoundingClientRect(); setPicker(picker !== null || !tools || !article ? null : tools.bottom - article.top + 6) }} expanded={picker !== null}><SmilePlus size={13}/></IconButton><i aria-hidden="true"/></>}<IconButton className="comment-icon-button" label="댓글 메뉴" onClick={() => { setPicker(null); setMenu(menu ? null : 'actions') }} expanded={Boolean(menu)}><MoreHorizontal size={14}/></IconButton></div></div>
    {comment.body && <p>{comment.body}</p>}{comment.imagePlaceholder && <div className="comment-image-placeholder">[이미지]</div>}{comment.imageUrl && <button className="comment-photo" onClick={() => setPhotoOpen(true)} aria-label="댓글 사진 크게 보기"><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></button>}
    <div className="comment-actions"><small className="comment-time">{comment.createdAt}{comment.edited && <span className="comment-edited">수정됨</span>}</small>{!readOnly && <button className="comment-reply-button" onClick={() => onReply(comment)}>답글 달기</button>}</div>
    {!isReply && replies.length > 0 && <div className="comment-replies">{replies.map((reply) => <CommentItem key={reply.id} comment={reply} onReply={onReply} onEdit={onEdit} isReply replyTargetId={replyTargetId} readOnly={readOnly}/>)}</div>}
    {picker !== null && <div ref={pickerRef} className="context-menu comment-reaction-picker" style={{ top: picker }} role="menu" aria-label="공감 고르기">{commentReactionList.map((reaction) => { const Icon = commentReactionIcon[reaction]; return <button key={reaction} role="menuitemradio" aria-checked={mine.includes(reaction)} className={mine.includes(reaction) ? 'selected' : ''} onClick={() => { reactToComment(comment.id, reaction); setPicker(null) }}><Icon size={16} strokeWidth={2}/><span>{reaction}</span></button> })}</div>}
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
  const commentComposer = canParticipate ? <div className="detail-comment-input">{editing ? <div className="replying"><span>댓글 수정 중</span><button onClick={cancelCompose}>취소</button></div> : replyTo && <div className="replying reply-to"><span><b>@{replyTo.authorName}</b> 님에게 답글</span><button onClick={() => { setReplyTo(null); commentInputRef.current?.focus() }}>취소</button></div>}{commentImageUrl && <div className="comment-upload-preview"><img src={commentImageUrl} alt="첨부할 사진 미리보기"/><button onClick={() => setCommentImageUrl('')} aria-label="첨부 사진 삭제"><X size={16}/></button></div>}<div className="comment-composer-row"><IconButton className="comment-photo-add" label="댓글에 사진 첨부" onClick={() => commentFileRef.current?.click()}><Camera size={20}/></IconButton><span className="composer-input-wrap"><input ref={commentInputRef} value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo && !editing ? '답글을 입력하세요' : '댓글을 입력하세요'} aria-label={replyTo && !editing ? `${replyTo.authorName}님에게 답글` : '댓글'}/></span><IconButton className="comment-submit" label={editing ? '댓글 수정' : '댓글 등록'} onClick={submit} disabled={!body.trim() && !commentImageUrl}><Send size={19}/></IconButton></div><input ref={commentFileRef} className="comment-file-input" type="file" accept="image/*" onChange={(event) => addPhoto(event.target.files?.[0])}/></div> : null
  return <AppShell nav={false} contentClassName={`board-detail-screen ${entering ? 'detail-enter' : ''}`} shellClassName={entering ? 'detail-enter-shell' : ''} bottomContent={<>{commentComposer ?? readOnlyBar}
    {editOpen && <EditBoardSheet board={board} canEdit={!outOfRange} onClose={closeEdit}/>}
    {confirm === 'delete' && <ConfirmDialog title="게시글을 삭제할까요?" description="삭제한 게시글은 다시 볼 수 없어요." confirmLabel="삭제" danger onClose={() => setConfirm(null)} onConfirm={() => deleteBoard(board.id)}/>} 
    {confirm === 'finish' && <ConfirmDialog title="게시판을 종료할까요?" description={"더 이상 댓글과 반응을 받지 않아요\n마이 > 최근 활동에서 해제 가능"} confirmLabel="종료" danger onClose={() => setConfirm(null)} onConfirm={() => { finishBoard(board.id); setConfirm(null) }}/>}
  </>}>
    <header className="detail-nav"><IconButton className="icon" label="뒤로 가기" onClick={() => back('board')}><ArrowLeft size={22}/></IconButton></header>
    {outOfRange && <p className="outside-notice">{board.distance <= RADIUS && locationPermission !== 'granted' ? '위치 권한이 꺼져 있어 읽기만 할 수 있어요' : '읽기 전용 · 범위 밖'}</p>}
    <article className="detail-article">
      <div className="detail-title-row"><h1 title={board.title}>{board.title}</h1><span className="detail-title-menu-wrap"><IconButton className="detail-title-menu" label="게시글 메뉴" onClick={() => setMenu(!menu)} expanded={menu}><MoreHorizontal size={18}/></IconButton>{menu && <div className="context-menu detail-menu">{board.authorId === user.id ? <><button onClick={() => { setEditOpen(true); setMenu(false) }}>수정</button><button onClick={() => { setConfirm('finish'); setMenu(false) }}>종료</button><button onClick={() => { setConfirm('delete'); setMenu(false) }}>삭제</button></> : <><button onClick={() => { reportTarget('게시글', board.id, '허위 또는 부적절한 정보'); setMenu(false) }}>신고</button><button onClick={() => { blockUser(board.authorId); setMenu(false) }}>차단</button></>}</div>}</span></div>
      <div className="detail-byline"><strong>{board.authorName}</strong><span>{board.createdAt}</span>{board.edited && <span className="detail-edited">수정됨</span>}<span><MapPin size={12}/>{board.distance}m</span></div>
      <p className="detail-body">{board.body}</p>
      {(board.imagePlaceholder || board.imageName) && <div className="board-image-placeholder detail-image">[이미지]</div>}
      <div className="detail-inline-reactions"><PostReactions board={board} interactive={canParticipate} fullLabels onReact={(reaction) => reactToBoard(board.id, reaction)}/></div>
    </article>
    <CommentVoteSection board={board} canChoose={canParticipate}/>
    <section className="comments-section"><div className="comments-heading"><h3>댓글</h3><span>{boardComments.length}</span></div>{rootComments.length ? shownComments.map((comment) => <CommentItem key={comment.id} comment={comment} replies={boardComments.filter((reply) => reply.parentId === comment.id)} onReply={canParticipate ? startComment : () => undefined} onEdit={startEdit} replyTargetId={replyTo?.id} readOnly={!canParticipate}/>) : <div className="comments-empty"><strong>아직 댓글이 없습니다</strong>{canParticipate && <p>가장 먼저 상황을 알려주세요</p>}</div>}{remainingComments > 0 && <button className="comments-more" onClick={() => setVisibleComments((count) => count + 3)}>댓글 {remainingComments}개 더 보기 <ChevronDown size={17}/></button>}{rootComments.length > 3 && remainingComments === 0 && <button className="comments-more" onClick={() => setVisibleComments(3)}>접기 <ChevronUp size={17}/></button>}</section>
  </AppShell>
}

// 게시글 수정 (작성은 하단 작성 버튼의 빠른 작성 시트에서 한다)

