import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bell, BellOff, Camera, ChevronDown, ChevronRight, ChevronUp, Eye, MoreHorizontal, Search, Send, X } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { participationOf, PARTICIPATION_RADIUS, StatusLine } from '../../components/ui/BoardStatus'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { CategoryChips, SortChips, applyBoardFilters, CATEGORY_OPTIONS, SORT_OPTIONS, type BoardSort, type CategoryFilter } from '../../components/ui/FilterBar'
import { ReportSheet } from '../../components/ui/ReportSheet'
import { SituationPulse } from '../../components/ui/SituationPulse'
import { useApp } from '../../context/AppContext'
import type { Category, Comment, CommentReaction } from '../../types/domain'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

export function BoardListScreen() {
  const { boards, comments, go, openBoard, inRange, mutedBoardIds, toggleBoardNotifications } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const sortValue = searchParams.get('sort') as BoardSort | null
  const categoryValue = searchParams.get('category') as CategoryFilter | null
  const sort = sortValue && SORT_OPTIONS.includes(sortValue) ? sortValue : '거리'
  const category = categoryValue && CATEGORY_OPTIONS.includes(categoryValue) ? categoryValue : '전체'
  const joinableOnly = searchParams.get('joinable') === '1'
  const updateFilter = (key: 'sort' | 'category' | 'joinable', value: string) => {
    const next = new URLSearchParams(searchParams)
    const isDefault = key === 'sort' ? value === '거리' : key === 'category' ? value === '전체' : value !== '1'
    if (isDefault) next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }
  const visibleBoards = useMemo(() => applyBoardFilters(boards, { category, sort, joinableOnly, inRange }), [boards, category, sort, joinableOnly, inRange])
  return <AppShell contentClassName="ux-board-screen">
    <header className="ux-board-header"><h1>게시판</h1><button className="icon map-search" onClick={() => go('search')} aria-label="검색"><Search size={26}/></button></header>
    <div className="ux-filter-stack">
      <CategoryChips value={category} onChange={(next) => updateFilter('category', next)}/>
      <SortChips value={sort} onChange={(next) => updateFilter('sort', next)} joinableOnly={joinableOnly} onJoinableOnly={(next) => updateFilter('joinable', next ? '1' : '0')}/>
    </div>
    <div className="ux-board-list">{visibleBoards.length
      ? visibleBoards.map((board) => <BoardCard
          key={board.id}
          board={board}
          inRange={inRange}
          commentCount={comments.filter((comment) => comment.boardId === board.id).length}
          notificationsMuted={mutedBoardIds.includes(board.id)}
          onToggleNotifications={() => toggleBoardNotifications(board.id)}
          onOpen={() => openBoard(board.id)}
        />)
      : <EmptyState title="조건에 맞는 게시판이 없어요" description={joinableOnly ? '참여 가능만 끄면 주변의 다른 상황도 볼 수 있어요.' : '카테고리를 바꿔보세요.'} action={joinableOnly ? '참여 가능만 끄기' : '전체 보기'} onAction={() => updateFilter(joinableOnly ? 'joinable' : 'category', joinableOnly ? '0' : '전체')}/>}
    </div>
  </AppShell>
}

export function SearchScreen() {
  const { boards, comments, back, openBoard, inRange } = useApp()
  const [query, setQuery] = useState('')
  // 기존 '열람 범위' 세그먼트는 눌러도 결과가 바뀌지 않는 죽은 UI였다. 실제로 걸러지게 한다.
  const [scope, setScope] = useState<'150m 안' | '전체'>('150m 안')
  const results = boards.filter((board) => board.status !== '숨김'
    && (scope === '전체' || board.distance <= PARTICIPATION_RADIUS)
    && (!query || `${board.title} ${board.body} ${board.category}`.includes(query)))
  return <AppShell>
    <div className="search-input"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소, 사건, 질문 검색" autoFocus/><button onClick={() => query ? setQuery('') : back('board')} aria-label={query ? '검색어 지우기' : '검색 닫기'}><X size={18}/></button></div>
    <div className="segment search-scope">{(['150m 안', '전체'] as const).map((item) => <button key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item}</button>)}</div>
    <h4>검색 결과 <small>{results.length}</small></h4>
    <div className="post-list">{results.length
      ? results.map((board) => <BoardCard key={board.id} board={board} inRange={inRange} commentCount={comments.filter((comment) => comment.boardId === board.id).length} onOpen={() => openBoard(board.id)}/>)
      : <EmptyState title={query ? `'${query}' 결과가 없어요` : '검색 결과가 없어요'} description={scope === '150m 안' ? '범위를 전체로 넓혀 다시 찾아볼 수 있어요.' : undefined} action={scope === '150m 안' ? '전체에서 찾기' : undefined} onAction={scope === '150m 안' ? () => setScope('전체') : undefined}/>}
    </div>
  </AppShell>
}

function CommentItem({ comment, replies = [], onReply, onReport, onBlock, canParticipate, isReply = false, highlighted = false, wasUnread = false }: {
  comment: Comment
  replies?: Comment[]
  onReply: (comment: Comment) => void
  onReport: (comment: Comment) => void
  onBlock: (comment: Comment) => void
  canParticipate: boolean
  isReply?: boolean
  highlighted?: boolean
  wasUnread?: boolean
}) {
  const { user, reactToComment, deleteComment } = useApp()
  const [menu, setMenu] = useState(false)
  // 기존에는 모든 댓글이 접힌 채 시작해 하나씩 펼쳐야 내용을 읽을 수 있었다. 읽는 것이 기본이어야 한다.
  const [collapsed, setCollapsed] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const reactions: CommentReaction[] = ['도움돼요', '맞아요', '정보가 달라요']

  useEffect(() => {
    if (!menu) return
    const closeMenu = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(false) }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [menu])

  return <div
    id={`comment-${comment.id}`}
    className={`comment ${wasUnread ? 'unread-comment' : 'read-comment'} ${isReply ? 'reply-comment' : ''} ${highlighted ? 'highlighted-comment' : ''} ${menu ? 'comment-menu-open' : ''}`}
  >
    <div className="comment-head">
      <div><strong>{comment.authorName}</strong><small>{comment.createdAt}{comment.verified ? ' · 현장 인증' : ''}</small></div>
      <div>
        <button className="comment-icon-button" onClick={() => setMenu(!menu)} aria-label="댓글 메뉴" aria-expanded={menu}><MoreHorizontal size={18}/></button>
        <button className="comment-icon-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? '댓글 펼치기' : '댓글 접기'}>{collapsed ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}</button>
      </div>
    </div>
    {!collapsed && <>
      {comment.body && <p>{comment.body}</p>}
      {comment.imagePlaceholder && <div className="comment-image-placeholder">[이미지]</div>}
      {comment.imageUrl && <button className="comment-photo" onClick={() => setPhotoOpen(true)} aria-label="댓글 사진 크게 보기"><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></button>}
      <div className="comment-reactions">{reactions.map((reaction) => <button key={reaction} className={comment.reactedByMe === reaction ? 'selected' : ''} disabled={!canParticipate} onClick={() => reactToComment(comment.id, reaction)}>{reaction} <b>{comment.reactions[reaction]}</b></button>)}</div>
      {!isReply && canParticipate && <button className="reply-link" onClick={() => onReply(comment)}>답글 쓰기</button>}
      {!isReply && replies.length > 0 && <div className="comment-replies">{replies.map((reply) => <CommentItem key={reply.id} comment={reply} onReply={onReply} onReport={onReport} onBlock={onBlock} canParticipate={canParticipate} isReply/>)}</div>}
    </>}
    {menu && <div ref={menuRef} className="context-menu comment-context-menu" role="menu" aria-label="댓글 메뉴">{comment.authorId === user.id
      ? <button onClick={() => deleteComment(comment.id)}>댓글 삭제</button>
      : <><button onClick={() => { onReport(comment); setMenu(false) }}>댓글 신고</button><button onClick={() => { onBlock(comment); setMenu(false) }}>사용자 차단</button></>}
    </div>}
    {photoOpen && comment.imageUrl && <div className="comment-photo-modal" role="dialog" aria-label="현장 사진 보기" onClick={() => setPhotoOpen(false)}><button aria-label="사진 닫기"><X size={22}/></button><img src={comment.imageUrl} alt="댓글에 첨부된 현장 사진"/></div>}
  </div>
}

export function BoardDetailScreen() {
  const { currentBoard: board, back, comments, user, go, inRange, reactToBoard, addComment, deleteBoard, finishBoard, reportTarget, blockUser, blockedUsers, markCommentsRead, mutedBoardIds, toggleBoardNotifications } = useApp()
  const [searchParams] = useSearchParams()
  const targetComment = searchParams.get('comment') ?? undefined
  const [body, setBody] = useState('')
  const [commentImageUrl, setCommentImageUrl] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [menu, setMenu] = useState(false)
  const [visibleComments, setVisibleComments] = useState(5)
  const [confirm, setConfirm] = useState<'delete' | 'finish' | 'block' | null>(null)
  const [reporting, setReporting] = useState(false)
  // 댓글의 신고/차단은 상세 화면이 한 벌만 그린다.
  const [commentAction, setCommentAction] = useState<{ kind: 'report' | 'block'; comment: Comment } | null>(null)
  const commentFileRef = useRef<HTMLInputElement>(null)
  const boardComments = comments.filter((comment) => comment.boardId === board?.id && !blockedUsers.includes(comment.authorId))

  /**
   * 읽음 표시를 위해 댓글을 일일이 펼쳤다 접게 하던 방식을 버리고,
   * 화면에 들어온 시점의 안 읽은 댓글을 기억해 두었다가 잠시 뒤 읽음 처리한다.
   * 기억해 둔 목록은 '여기부터 새 댓글' 구분선을 그리는 데도 쓴다.
   */
  const unreadOnEntry = useRef<{ boardId?: string; ids: string[] }>({ ids: [] })
  if (unreadOnEntry.current.boardId !== board?.id) {
    unreadOnEntry.current = { boardId: board?.id, ids: boardComments.filter((comment) => !comment.read && comment.authorId !== user.id).map((comment) => comment.id) }
  }
  const unreadIds = unreadOnEntry.current.ids
  useEffect(() => {
    if (!unreadIds.length) return
    const timer = window.setTimeout(() => markCommentsRead(unreadIds), 1800)
    return () => window.clearTimeout(timer)
  }, [unreadIds, markCommentsRead])

  // 알림을 타고 들어왔다면 글 맨 위가 아니라 그 댓글로 데려간다.
  useEffect(() => {
    if (!targetComment) return
    const timer = window.setTimeout(() => document.getElementById(`comment-${targetComment}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
    return () => window.clearTimeout(timer)
  }, [targetComment])

  if (!board) return null
  const { canJoin } = participationOf(board, inRange)
  const muted = mutedBoardIds.includes(board.id)
  const submit = () => {
    if (!body.trim() && !commentImageUrl) return
    addComment(body.trim(), replyTo?.id, commentImageUrl || undefined)
    setBody(''); setCommentImageUrl(''); setReplyTo(null); setVisibleComments(boardComments.length + 1)
  }
  const rootComments = boardComments.filter((comment) => !comment.parentId)
  const shownComments = rootComments.slice(0, visibleComments)
  const remainingComments = rootComments.length - shownComments.length
  const firstUnreadId = rootComments.find((comment) => unreadIds.includes(comment.id))?.id
  const newRootCount = rootComments.filter((comment) => unreadIds.includes(comment.id)).length

  return <AppShell nav={false} contentClassName="board-detail-screen">
    <header className="detail-nav">
      <button className="icon" onClick={() => back('board')} aria-label="뒤로 가기"><ArrowLeft size={22}/></button>
      <div className="detail-nav-actions">
        {/* 글을 읽고 나서 '계속 지켜보기'를 고를 수 있어야 한다. 기존에는 목록 카드에만 있었다. */}
        <button className="icon" onClick={() => toggleBoardNotifications(board.id)} aria-label={muted ? '이 게시판 알림 켜기' : '이 게시판 알림 끄기'} aria-pressed={!muted}>{muted ? <BellOff size={20}/> : <Bell size={20}/>}</button>
        <button className="icon" onClick={() => setMenu(!menu)} aria-label="게시글 메뉴"><MoreHorizontal size={24}/></button>
      </div>
    </header>
    {menu && <div className="context-menu detail-menu">{board.authorId === user.id
      ? <><button onClick={() => go('edit')}>게시글 수정</button><button onClick={() => setConfirm('finish')}>게시판 종료</button><button onClick={() => setConfirm('delete')}>게시글 삭제</button></>
      : <><button onClick={() => { setReporting(true); setMenu(false) }}>게시글 신고</button><button onClick={() => { setConfirm('block'); setMenu(false) }}>작성자 차단</button></>}
    </div>}

    <article className="detail-article">
      <span className="detail-category">{board.category}</span>
      <h1>{board.title}</h1>
      <StatusLine board={board} inRange={inRange}/>
      <div className="detail-author"><strong>{board.authorName}</strong><span>{board.createdAt}</span><span className="detail-views"><Eye size={14}/>{board.views}</span></div>
      <p className="detail-body">{board.body}</p>
      {board.imageName && <div className="attachment">첨부 이미지: {board.imageName}</div>}
    </article>

    <SituationPulse board={board} interactive={canJoin} onReact={(reaction) => reactToBoard(board.id, reaction)}/>
    {!canJoin && <p className="join-hint">{board.status === '종료됨' ? '종료된 게시판이에요. 기록은 계속 볼 수 있어요.' : '150m 밖이라 읽기만 가능해요. 가까이 가면 참여할 수 있어요.'}</p>}

    <section className="comments-section">
      <div className="comments-heading"><h3>댓글</h3><span>{boardComments.length}</span></div>
      {rootComments.length
        ? shownComments.map((comment) => <div key={comment.id}>
            {comment.id === firstUnreadId && <div className="unread-divider"><span>여기부터 새 댓글 {newRootCount}개</span></div>}
            <CommentItem
              comment={comment}
              replies={boardComments.filter((reply) => reply.parentId === comment.id)}
              onReply={setReplyTo}
              onReport={(target) => setCommentAction({ kind: 'report', comment: target })}
              onBlock={(target) => setCommentAction({ kind: 'block', comment: target })}
              canParticipate={canJoin}
              highlighted={comment.id === targetComment}
              wasUnread={unreadIds.includes(comment.id)}
            />
          </div>)
        : <EmptyState title="아직 댓글이 없어요" description={canJoin ? '가장 먼저 상황을 알려주세요.' : undefined}/>}
      {remainingComments > 0 && <button className="comments-more" onClick={() => setVisibleComments((count) => count + 5)}>댓글 {remainingComments}개 더 보기 <ChevronDown size={17}/></button>}
      {rootComments.length > 5 && remainingComments === 0 && <button className="comments-more" onClick={() => setVisibleComments(5)}>댓글 접기 <ChevronUp size={17}/></button>}
    </section>

    {canJoin && <>
      {replyTo && <div className="replying"><span>{replyTo.authorName}님에게 답글 작성 중</span><button onClick={() => setReplyTo(null)}>취소</button></div>}
      <div className="detail-comment-input">
        {commentImageUrl && <div className="comment-upload-preview"><img src={commentImageUrl} alt="첨부할 사진 미리보기"/><button onClick={() => setCommentImageUrl('')} aria-label="첨부 사진 삭제"><X size={16}/></button></div>}
        <div className="comment-composer-row">
          <button className="comment-photo-add" onClick={() => commentFileRef.current?.click()} aria-label="댓글에 사진 첨부"><Camera size={20}/></button>
          <input value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? '답글을 입력하세요' : '댓글을 입력하세요'}/>
          <button className="comment-submit" onClick={submit} disabled={!body.trim() && !commentImageUrl} aria-label="댓글 등록"><Send size={19}/></button>
        </div>
        <input ref={commentFileRef} className="comment-file-input" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) setCommentImageUrl(URL.createObjectURL(file)) }}/>
      </div>
    </>}

    {commentAction?.kind === 'report' && <ReportSheet targetType="댓글" targetLabel={`${commentAction.comment.authorName}님의 댓글`} onClose={() => setCommentAction(null)} onSubmit={(reason) => { reportTarget('댓글', commentAction.comment.id, reason); setCommentAction(null) }}/>}
    {commentAction?.kind === 'block' && <ConfirmDialog title={`${commentAction.comment.authorName}님을 차단할까요?`} description="차단하면 이 사용자의 댓글이 보이지 않습니다. 설정에서 다시 해제할 수 있어요." confirmLabel="차단" danger onClose={() => setCommentAction(null)} onConfirm={() => { blockUser(commentAction.comment.authorId); setCommentAction(null) }}/>}
    {reporting && <ReportSheet targetType="게시글" targetLabel={board.title} onClose={() => setReporting(false)} onSubmit={(reason) => { reportTarget('게시글', board.id, reason); setReporting(false) }}/>}
    {confirm === 'delete' && <ConfirmDialog title="게시글을 삭제할까요?" description="되돌릴 수 없어요. 댓글도 함께 사라집니다." confirmLabel="삭제" danger onClose={() => setConfirm(null)} onConfirm={() => deleteBoard(board.id)}/>}
    {confirm === 'finish' && <ConfirmDialog title="게시판을 종료할까요?" description="종료 후에는 새 댓글과 반응을 받을 수 없어요. 기록은 계속 남습니다." confirmLabel="종료" onClose={() => setConfirm(null)} onConfirm={() => { finishBoard(board.id); setConfirm(null) }}/>}
    {confirm === 'block' && <ConfirmDialog title={`${board.authorName}님을 차단할까요?`} description="차단하면 이 사용자의 글과 댓글이 보이지 않습니다. 설정에서 다시 해제할 수 있어요." confirmLabel="차단" danger onClose={() => setConfirm(null)} onConfirm={() => { blockUser(board.authorId); setConfirm(null) }}/>}
  </AppShell>
}

export function CategoryScreen() {
  const { go } = useApp()
  return <AppShell><BackHeader title="상황 카테고리 선택" onBack={() => go('board')}/><p className="muted">게시글 성격에 맞는 카테고리를 선택하세요.</p>{categories.map((category) => <button key={category} className="category" onClick={() => { sessionStorage.setItem('wgo-category', category); go('create') }}><span><strong>{category}</strong><small>{category === '긴급 사고' ? '화재, 붕괴, 사고와 같은 긴급 상황' : category === '도움 요청' ? '길 찾기, 분실물 등 현장 도움' : category === '동네 소식' ? '행사, 나눔, 주변 소식' : '정전, 소음 등 일상 상황'}</small></span><ChevronRight/></button>)}</AppShell>
}

function BoardForm({ mode }: { mode: 'create' | 'edit' }) {
  const { currentBoard, createBoard, updateBoard, go, inRange } = useApp()
  const savedCategory = sessionStorage.getItem('wgo-category') as Category | null
  const [category, setCategory] = useState<Category>(mode === 'edit' && currentBoard ? currentBoard.category : savedCategory || '긴급 사고')
  const [title, setTitle] = useState(mode === 'edit' ? currentBoard?.title || '' : '')
  const [body, setBody] = useState(mode === 'edit' ? currentBoard?.body || '' : '')
  const [imageName, setImageName] = useState(mode === 'edit' ? currentBoard?.imageName : undefined)
  if (!inRange) return <AppShell><BackHeader title="게시판 작성" onBack={() => go('board')}/><EmptyState title="150m 밖에서는 게시판을 만들 수 없어요" description="참여 범위 안으로 들어가면 바로 쓸 수 있어요." action="지도로 돌아가기" onAction={() => go('home')}/></AppShell>
  const submit = () => {
    if (!title.trim() || !body.trim()) return
    if (mode === 'edit' && currentBoard) updateBoard(currentBoard.id, { title: title.trim(), body: body.trim(), category })
    else createBoard({ title: title.trim(), body: body.trim(), category, imageName })
  }
  return <AppShell><BackHeader title={mode === 'edit' ? '게시글 수정' : '게시판 만들기'} onBack={() => go(mode === 'edit' ? 'detail' : 'category')}/><div className="live-card"><small>현재 위치 150m 안</small><strong>참여 가능 38명</strong><p>정확한 상세 위치는 다른 사용자에게 공개되지 않습니다.</p></div><label>카테고리</label><select className="field" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><label>제목</label><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="무슨 일이 궁금한가요?" maxLength={50}/><small className="counter">{title.length}/50</small><label>상황 설명</label><textarea className="field" value={body} onChange={(event) => setBody(event.target.value)} placeholder="확인한 사실과 궁금한 점을 적어주세요." maxLength={500}/><label className="file-field">현장 사진 첨부<input type="file" accept="image/*" onChange={(event) => setImageName(event.target.files?.[0]?.name)}/></label>{imageName && <div className="attachment">{imageName}<button onClick={() => setImageName(undefined)}>삭제</button></div>}<button className="primary" onClick={submit} disabled={!title.trim() || !body.trim()}>{mode === 'edit' ? '수정 저장' : '게시판 열기'}</button></AppShell>
}

export function CreateBoardScreen() { return <BoardForm mode="create"/> }
export function EditBoardScreen() { return <BoardForm mode="edit"/> }
