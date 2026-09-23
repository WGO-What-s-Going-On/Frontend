import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, ChevronDown, ChevronRight, ChevronUp, Eye, MapPin, MoreHorizontal, Search, Send, X } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import type { Category, Comment, CommentReaction } from '../../types/domain'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']
type BoardSort = '거리' | '최신' | '활발' | '참여 가능'

export function BoardListScreen() {
  const { boards, comments, go, openBoard, mutedBoardIds, toggleBoardNotifications } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const sortOptions: BoardSort[] = ['거리', '최신', '활발', '참여 가능']
  const categoryOptions: (Category | '전체')[] = ['전체', '긴급 사고', '도움 요청', '동네 소식']
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
  return <AppShell contentClassName="ux-board-screen">
    <header className="ux-board-header"><h1>게시판</h1><button className="icon map-search" onClick={() => go('search')} aria-label="검색"><Search size={26}/></button></header>
    <div className="ux-category-filters"><label className="ux-sort-filter" aria-label="게시글 정렬"><select value={sort} onChange={(event) => updateFilter('sort', event.target.value)}><option>거리</option><option>최신</option><option>활발</option><option>참여 가능</option></select></label>{categoryOptions.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => updateFilter('category', item)}>{item}</button>)}</div>
    <div className="ux-board-list">{visibleBoards.length ? visibleBoards.map((board) => <BoardCard key={board.id} board={board} commentCount={comments.filter((comment) => comment.boardId === board.id).length} notificationsMuted={mutedBoardIds.includes(board.id)} onToggleNotifications={() => toggleBoardNotifications(board.id)} onOpen={() => openBoard(board.id)}/>) : <EmptyState title="조건에 맞는 게시판이 없습니다." action="전체 게시글 보기" onAction={() => updateFilter('category', '전체')}/>}</div>
  </AppShell>
}

export function SearchScreen() {
  const { boards, back, openBoard } = useApp()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'150m 안' | '근처 요약' | '전체 핀'>('150m 안')
  const results = boards.filter((board) => board.status !== '숨김' && (!query || `${board.title} ${board.body} ${board.category}`.includes(query)))
  return <AppShell>
    <div className="search-input"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소, 사건, 질문 검색" autoFocus/><button onClick={() => query ? setQuery('') : back('board')}><X size={18}/></button></div>
    <h4>열람 범위</h4><div className="segment">{(['150m 안', '근처 요약', '전체 핀'] as const).map((item) => <button key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item}</button>)}</div>
    <h4>검색 결과 <small>{results.length}</small></h4><div className="post-list">{results.map((board) => <BoardCard key={board.id} board={board} onOpen={() => openBoard(board.id)}/>)}</div>
  </AppShell>
}

function CommentItem({ comment, replies = [], onReply, isReply = false }: { comment: Comment; replies?: Comment[]; onReply: (comment: Comment) => void; isReply?: boolean }) {
  const { user, reactToComment, deleteComment, markCommentRead, reportTarget, blockUser } = useApp()
  const [menu, setMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [photoOpen, setPhotoOpen] = useState(false)
  const reactions: CommentReaction[] = ['도움돼요', '맞아요', '정보가 달라요']
  const toggleCollapsed = () => {
    if (!collapsed) {
      if (!comment.read) markCommentRead(comment.id)
      setMenu(false)
    }
    setCollapsed((value) => !value)
  }
  return <div className={`comment ${comment.read ? 'read-comment' : 'unread-comment'} ${isReply ? 'reply-comment' : ''}`}>
    <div className="comment-head"><div><strong>{comment.authorName}</strong><small>{comment.createdAt}{comment.verified ? ' · 현장 인증' : ''}{comment.read && <span className="comment-read-status"><Check size={11}/>읽음</span>}</small></div><div><button className="comment-icon-button" onClick={toggleCollapsed} aria-label={collapsed ? '댓글 펼치기' : comment.read ? '댓글 접기' : '댓글 접기 및 읽음 표시'}>{collapsed ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}</button>{!collapsed && <button className="comment-icon-button" onClick={() => setMenu(!menu)} aria-label="댓글 메뉴"><MoreHorizontal size={18}/></button>}</div></div>
    {!collapsed && <>{comment.body && <p>{comment.body}</p>}{comment.imagePlaceholder && <div className="comment-image-placeholder">[이미지]</div>}{comment.imageUrl && <button className="comment-photo" onClick={() => setPhotoOpen(true)} aria-label="댓글 사진 크게 보기"><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></button>}<div className="comment-reactions">{reactions.map((reaction) => <button key={reaction} className={comment.reactedByMe === reaction ? 'selected' : ''} onClick={() => reactToComment(comment.id, reaction)}>{reaction} <b>{comment.reactions[reaction]}</b></button>)}</div>{!isReply && <button className="reply-link" onClick={() => onReply(comment)}>답글</button>}{!isReply && replies.length > 0 && <div className="comment-replies">{replies.map((reply) => <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply/>)}</div>}</>}
    {menu && <div className="context-menu">{comment.authorId === user.id ? <button onClick={() => deleteComment(comment.id)}>댓글 삭제</button> : <><button onClick={() => { reportTarget('댓글', comment.id, '부정확하거나 부적절한 정보'); setMenu(false) }}>댓글 신고</button><button onClick={() => { blockUser(comment.authorId); setMenu(false) }}>사용자 차단</button></>}</div>}
    {photoOpen && comment.imageUrl && <div className="comment-photo-modal" role="dialog" aria-label="현장 사진 보기" onClick={() => setPhotoOpen(false)}><button aria-label="사진 닫기"><X size={22}/></button><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></div>}
  </div>
}

export function BoardDetailScreen() {
  const { currentBoard: board, back, comments, user, go, inRange, reactToBoard, addComment, deleteBoard, finishBoard, reportTarget, blockUser, blockedUsers } = useApp()
  const [body, setBody] = useState('')
  const [commentImageUrl, setCommentImageUrl] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [menu, setMenu] = useState(false)
  const [visibleComments, setVisibleComments] = useState(3)
  const [confirm, setConfirm] = useState<'delete' | 'finish' | null>(null)
  const commentFileRef = useRef<HTMLInputElement>(null)
  if (!board) return null
  const boardComments = comments.filter((comment) => comment.boardId === board.id && !blockedUsers.includes(comment.authorId))
  const submit = () => { if (!body.trim() && !commentImageUrl) return; addComment(body.trim(), replyTo?.id, commentImageUrl || undefined); setBody(''); setCommentImageUrl(''); setReplyTo(null); setVisibleComments(boardComments.length + 1) }
  const addPhoto = (file?: File) => { if (file) setCommentImageUrl(URL.createObjectURL(file)) }
  const rootComments = boardComments.filter((comment) => !comment.parentId)
  const shownComments = rootComments.slice(0, visibleComments)
  const remainingComments = rootComments.length - shownComments.length
  return <AppShell nav={false} contentClassName="board-detail-screen">
    <header className="detail-nav"><button className="icon" onClick={() => back('board')} aria-label="뒤로 가기"><ArrowLeft size={22}/></button><button className="icon" onClick={() => setMenu(!menu)} aria-label="게시글 메뉴"><MoreHorizontal size={24}/></button></header>
    {menu && <div className="context-menu detail-menu">{board.authorId === user.id ? <><button onClick={() => go('edit')}>게시글 수정</button><button onClick={() => setConfirm('finish')}>게시판 종료</button><button onClick={() => setConfirm('delete')}>게시글 삭제</button></> : <><button onClick={() => { reportTarget('게시글', board.id, '허위 또는 부적절한 정보'); setMenu(false) }}>게시글 신고</button><button onClick={() => { blockUser(board.authorId); setMenu(false) }}>작성자 차단</button></>}</div>}
    <article className="detail-article">
      <h1>{board.title}</h1>
      <div className="detail-author"><strong>{board.authorName}</strong><span>{board.createdAt}</span></div>
      <div className="detail-meta"><span><MapPin size={15}/>{board.distance}m</span><span><Eye size={15}/>조회 {board.views}</span></div>
      <p className="detail-body">{board.body}</p>
      {board.imageName && <div className="attachment">첨부 이미지: {board.imageName}</div>}
    </article>
    <section className="detail-reactions"><h3>공감</h3><PostReactions board={board} interactive={inRange && board.status === '실시간'} onReact={(reaction) => reactToBoard(board.id, reaction)}/></section>
    {!inRange && <div className="notice-box"><strong>150m 밖에서는 열람만 가능합니다.</strong></div>}
    <section className="comments-section"><div className="comments-heading"><h3>댓글</h3><span>{boardComments.length}</span></div>{rootComments.length ? shownComments.map((comment) => <CommentItem key={comment.id} comment={comment} replies={boardComments.filter((reply) => reply.parentId === comment.id)} onReply={setReplyTo}/>) : <div className="comments-empty"><strong>아직 댓글이 없습니다</strong><p>가장 먼저 상황을 알려주세요</p></div>}{remainingComments > 0 && <button className="comments-more" onClick={() => setVisibleComments((count) => count + 3)}>댓글 {remainingComments}개 더 보기 <ChevronDown size={17}/></button>}{rootComments.length > 3 && remainingComments === 0 && <button className="comments-more" onClick={() => setVisibleComments(3)}>댓글 목록 접기 <ChevronUp size={17}/></button>}</section>
    {inRange && board.status === '실시간' && <>{replyTo && <div className="replying"><span>{replyTo.authorName}님에게 답글 작성 중</span><button onClick={() => setReplyTo(null)}>취소</button></div>}<div className="detail-comment-input">{commentImageUrl && <div className="comment-upload-preview"><img src={commentImageUrl} alt="첨부할 사진 미리보기"/><button onClick={() => setCommentImageUrl('')} aria-label="첨부 사진 삭제"><X size={16}/></button></div>}<div className="comment-composer-row"><button className="comment-photo-add" onClick={() => commentFileRef.current?.click()} aria-label="댓글에 사진 첨부"><Camera size={20}/></button><input value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? '답글을 입력하세요' : '댓글을 입력하세요'}/><button className="comment-submit" onClick={submit} disabled={!body.trim() && !commentImageUrl} aria-label="댓글 등록"><Send size={19}/></button></div><input ref={commentFileRef} className="comment-file-input" type="file" accept="image/*" onChange={(event) => addPhoto(event.target.files?.[0])}/></div></>}
    {confirm === 'delete' && <ConfirmDialog title="게시글을 삭제할까요?" description="목업에서는 즉시 목록에서 제거됩니다." confirmLabel="삭제" danger onClose={() => setConfirm(null)} onConfirm={() => deleteBoard(board.id)}/>} 
    {confirm === 'finish' && <ConfirmDialog title="게시판을 종료할까요?" description="종료 후에는 새 댓글과 반응을 작성할 수 없습니다." confirmLabel="종료" onClose={() => setConfirm(null)} onConfirm={() => { finishBoard(board.id); setConfirm(null) }}/>} 
  </AppShell>
}

export function CategoryScreen() {
  const { go } = useApp()
  return <AppShell><h1>상황 카테고리 선택</h1><p className="muted">게시글 성격에 맞는 카테고리를 선택하세요.</p>{categories.map((category) => <button key={category} className="category" onClick={() => { sessionStorage.setItem('wgo-category', category); go('create') }}><span><strong>{category}</strong><small>{category === '긴급 사고' ? '화재, 붕괴, 사고와 같은 긴급 상황' : category === '도움 요청' ? '길 찾기, 분실물 등 현장 도움' : category === '동네 소식' ? '행사, 나눔, 주변 소식' : '정전, 소음 등 일상 상황'}</small></span><ChevronRight/></button>)}</AppShell>
}

function BoardForm({ mode }: { mode: 'create' | 'edit' }) {
  const { currentBoard, createBoard, updateBoard, go, inRange } = useApp()
  const savedCategory = sessionStorage.getItem('wgo-category') as Category | null
  const [category, setCategory] = useState<Category>(mode === 'edit' && currentBoard ? currentBoard.category : savedCategory || '긴급 사고')
  const [title, setTitle] = useState(mode === 'edit' ? currentBoard?.title || '' : '')
  const [body, setBody] = useState(mode === 'edit' ? currentBoard?.body || '' : '')
  const [imageName, setImageName] = useState(mode === 'edit' ? currentBoard?.imageName : undefined)
  if (!inRange) return <AppShell><BackHeader title="게시판 작성" onBack={() => go('board')}/><EmptyState title="150m 밖에서는 게시판을 작성할 수 없습니다." action="지도로 돌아가기" onAction={() => go('home')}/></AppShell>
  const submit = () => {
    if (!title.trim() || !body.trim()) return
    if (mode === 'edit' && currentBoard) updateBoard(currentBoard.id, { title: title.trim(), body: body.trim(), category })
    else createBoard({ title: title.trim(), body: body.trim(), category, imageName })
  }
  return <AppShell><BackHeader title={mode === 'edit' ? '게시글 수정' : '게시판 만들기'} onBack={() => go(mode === 'edit' ? 'detail' : 'category')}/><div className="live-card"><small>현재 위치 150m 안</small><strong>참여 가능 38명</strong><p>정확한 상세 위치는 다른 사용자에게 공개되지 않습니다.</p></div><label>카테고리</label><select className="field" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><label>제목</label><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="무슨 일이 궁금한가요?" maxLength={50}/><small className="counter">{title.length}/50</small><label>상황 설명</label><textarea className="field" value={body} onChange={(event) => setBody(event.target.value)} placeholder="확인한 사실과 궁금한 점을 적어주세요." maxLength={500}/><label className="file-field">현장 사진 첨부<input type="file" accept="image/*" onChange={(event) => setImageName(event.target.files?.[0]?.name)}/></label>{imageName && <div className="attachment">{imageName}<button onClick={() => setImageName(undefined)}>삭제</button></div>}<button className="primary" onClick={submit} disabled={!title.trim() || !body.trim()}>{mode === 'edit' ? '수정 저장' : '게시판 열기'}</button></AppShell>
}

export function CreateBoardScreen() { return <BoardForm mode="create"/> }
export function EditBoardScreen() { return <BoardForm mode="edit"/> }

function EmptyState({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><strong>{title}</strong><button className="secondary-button" onClick={onAction}>{action}</button></div>
}
