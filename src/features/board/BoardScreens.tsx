import { useMemo, useState } from 'react'
import { ArrowLeft, Camera, ChevronRight, Eye, MapPin, MoreHorizontal, Search, Send, X } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { BoardCard } from '../../components/ui/BoardCard'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PostReactions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import type { Category, Comment, CommentReaction } from '../../types/domain'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

export function BoardListScreen() {
  const { boards, go, openBoard } = useApp()
  const [sort, setSort] = useState<'거리순' | '최신순' | '활성순'>('거리순')
  const [category, setCategory] = useState<Category | '전체'>('전체')
  const visibleBoards = useMemo(() => {
    const filtered = boards.filter((board) => board.status !== '숨김' && (category === '전체' || board.category === category))
    return [...filtered].sort((a, b) => sort === '거리순' ? a.distance - b.distance : sort === '활성순' ? Object.values(b.reactions).reduce((x, y) => x + y, 0) - Object.values(a.reactions).reduce((x, y) => x + y, 0) : b.id.localeCompare(a.id))
  }, [boards, category, sort])
  return <AppShell>
    <header><h1>실시간 게시판</h1><button className="mini-primary" onClick={() => go('category')}>새 글</button></header>
    <button className="search-box" onClick={() => go('search')}><Search size={18}/> 장소, 사건, 도움 요청 검색</button>
    <div className="chips">{(['전체', ...categories] as const).map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="chips sort">{(['거리순', '최신순', '활성순'] as const).map((item) => <button key={item} className={sort === item ? 'dark' : ''} onClick={() => setSort(item)}>{item}</button>)}</div>
    <div className="post-list">{visibleBoards.length ? visibleBoards.map((board) => <BoardCard key={board.id} board={board} onOpen={() => openBoard(board.id)}/>) : <EmptyState title="조건에 맞는 게시판이 없습니다." action="필터 초기화" onAction={() => setCategory('전체')}/>}</div>
  </AppShell>
}

export function SearchScreen() {
  const { boards, go, openBoard } = useApp()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'150m 안' | '근처 요약' | '전체 핀'>('150m 안')
  const results = boards.filter((board) => board.status !== '숨김' && (!query || `${board.title} ${board.body} ${board.category}`.includes(query)))
  return <AppShell>
    <div className="search-input"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소, 사건, 질문 검색" autoFocus/><button onClick={() => query ? setQuery('') : go('board')}><X size={18}/></button></div>
    <h4>열람 범위</h4><div className="segment">{(['150m 안', '근처 요약', '전체 핀'] as const).map((item) => <button key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item}</button>)}</div>
    <h4>검색 결과 <small>{results.length}</small></h4><div className="post-list">{results.map((board) => <BoardCard key={board.id} board={board} onOpen={() => openBoard(board.id)}/>)}</div>
  </AppShell>
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: (comment: Comment) => void }) {
  const { user, reactToComment, deleteComment, reportTarget, blockUser } = useApp()
  const [menu, setMenu] = useState(false)
  const reactions: CommentReaction[] = ['도움돼요', '맞아요', '정보가 달라요']
  return <div className={`comment ${comment.verified ? 'verified' : ''} ${comment.parentId ? 'reply-comment' : ''}`}>
    <div className="row"><small>{comment.authorName} · {comment.createdAt}{comment.verified ? ' · 현장 인증' : ''}</small><button className="plain-button" onClick={() => setMenu(!menu)}>더보기</button></div>
    <p>{comment.body}</p>
    <div className="comment-reactions">{reactions.map((reaction) => <button key={reaction} className={comment.reactedByMe === reaction ? 'selected' : ''} onClick={() => reactToComment(comment.id, reaction)}>{reaction} <b>{comment.reactions[reaction]}</b></button>)}</div>
    <button className="reply-link" onClick={() => onReply(comment)}>답글 달기</button>
    {menu && <div className="context-menu">{comment.authorId === user.id ? <button onClick={() => deleteComment(comment.id)}>댓글 삭제</button> : <><button onClick={() => { reportTarget('댓글', comment.id, '부정확하거나 부적절한 정보'); setMenu(false) }}>댓글 신고</button><button onClick={() => { blockUser(comment.authorId); setMenu(false) }}>사용자 차단</button></>}</div>}
  </div>
}

export function BoardDetailScreen() {
  const { currentBoard: board, detailOrigin, comments, user, go, inRange, reactToBoard, addComment, deleteBoard, finishBoard, reportTarget, blockUser, blockedUsers } = useApp()
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [menu, setMenu] = useState(false)
  const [pollChoice, setPollChoice] = useState<'yes' | 'no' | null>(null)
  const [confirm, setConfirm] = useState<'delete' | 'finish' | null>(null)
  if (!board) return null
  const boardComments = comments.filter((comment) => comment.boardId === board.id && !blockedUsers.includes(comment.authorId))
  const submit = () => { if (!body.trim()) return; addComment(body.trim(), replyTo?.id); setBody(''); setReplyTo(null) }
  return <AppShell nav={false} contentClassName="board-detail-screen">
    <header className="detail-nav"><button className="icon" onClick={() => go(detailOrigin)} aria-label="뒤로 가기"><ArrowLeft size={22}/></button><button className="icon" onClick={() => setMenu(!menu)} aria-label="게시글 메뉴"><MoreHorizontal size={24}/></button></header>
    {menu && <div className="context-menu detail-menu">{board.authorId === user.id ? <><button onClick={() => go('edit')}>게시글 수정</button><button onClick={() => setConfirm('finish')}>게시판 종료</button><button onClick={() => setConfirm('delete')}>게시글 삭제</button></> : <><button onClick={() => { reportTarget('게시글', board.id, '허위 또는 부적절한 정보'); setMenu(false) }}>게시글 신고</button><button onClick={() => { blockUser(board.authorId); setMenu(false) }}>작성자 차단</button></>}</div>}
    <article className="detail-article">
      <div className="detail-status"><span className="badge">{board.category}</span><span className={board.status === '실시간' ? 'status-live' : 'status-ended'}>{board.status}</span></div>
      <h1>{board.title}</h1>
      <div className="detail-author"><strong>{board.authorName}</strong><span>{board.createdAt}</span></div>
      <div className="detail-meta"><span><MapPin size={15}/>{board.distance}m</span><span><Eye size={15}/>조회 {board.views}</span></div>
      <p className="detail-body">{board.body}</p>
      {board.imageName && <div className="attachment">첨부 이미지: {board.imageName}</div>}
      {board.hasPoll && <div className="detail-poll"><strong>현재도 같은 상황인가요?</strong><p>현재 현장 상황을 알려주세요</p><div><button className={pollChoice === 'yes' ? 'selected' : ''} aria-pressed={pollChoice === 'yes'} onClick={() => setPollChoice('yes')}>지금도 그래요</button><button className={pollChoice === 'no' ? 'selected' : ''} aria-pressed={pollChoice === 'no'} onClick={() => setPollChoice('no')}>아니에요</button></div>{pollChoice && <small>응답이 반영되었습니다</small>}</div>}
    </article>
    <section className="detail-reactions"><h3>이 글에 공감하기</h3><p>현장 상황에 맞는 반응을 선택해주세요</p><PostReactions board={board} interactive={inRange && board.status === '실시간'} onReact={(reaction) => reactToBoard(board.id, reaction)}/></section>
    {!inRange && <div className="notice-box"><strong>150m 밖에서는 열람만 가능합니다.</strong></div>}
    {inRange && board.status === '실시간' && <button className="detail-photo"><Camera size={22}/><span><strong>현장 사진</strong><small>사진을 확인하거나 현재 상황을 제보해 주세요</small></span><ChevronRight size={20}/></button>}
    <section className="comments-section"><div className="comments-heading"><h3>현장 댓글</h3><span>{boardComments.length}</span></div>{boardComments.length ? boardComments.map((comment) => <CommentItem key={comment.id} comment={comment} onReply={setReplyTo}/>) : <div className="comments-empty"><strong>아직 댓글이 없습니다</strong><p>가장 먼저 현장 상황을 알려주세요</p></div>}</section>
    {inRange && board.status === '실시간' && <>{replyTo && <div className="replying"><span>{replyTo.authorName}님에게 답글 작성 중</span><button onClick={() => setReplyTo(null)}>취소</button></div>}<div className="comment-input detail-comment-input"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? '답글을 입력하세요' : '현장 댓글을 남겨주세요'}/><button onClick={submit} disabled={!body.trim()} aria-label="댓글 등록"><Send size={20}/></button></div></>}
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
  const [hasPoll, setHasPoll] = useState(mode === 'edit' ? Boolean(currentBoard?.hasPoll) : false)
  const [imageName, setImageName] = useState(mode === 'edit' ? currentBoard?.imageName : undefined)
  if (!inRange) return <AppShell><BackHeader title="게시판 작성" onBack={() => go('board')}/><EmptyState title="150m 밖에서는 게시판을 작성할 수 없습니다." action="지도로 돌아가기" onAction={() => go('home')}/></AppShell>
  const submit = () => {
    if (!title.trim() || !body.trim()) return
    if (mode === 'edit' && currentBoard) updateBoard(currentBoard.id, { title: title.trim(), body: body.trim(), category })
    else createBoard({ title: title.trim(), body: body.trim(), category, hasPoll, imageName })
  }
  return <AppShell><BackHeader title={mode === 'edit' ? '게시글 수정' : '게시판 만들기'} onBack={() => go(mode === 'edit' ? 'detail' : 'category')}/><div className="live-card"><small>현재 위치 150m 안</small><strong>참여 가능 38명</strong><p>정확한 상세 위치는 다른 사용자에게 공개되지 않습니다.</p></div><label>카테고리</label><select className="field" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><label>제목</label><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="무슨 일이 궁금한가요?" maxLength={50}/><small className="counter">{title.length}/50</small><label>상황 설명</label><textarea className="field" value={body} onChange={(event) => setBody(event.target.value)} placeholder="확인한 사실과 궁금한 점을 적어주세요." maxLength={500}/><label className="file-field">현장 사진 첨부<input type="file" accept="image/*" onChange={(event) => setImageName(event.target.files?.[0]?.name)}/></label>{imageName && <div className="attachment">{imageName}<button onClick={() => setImageName(undefined)}>삭제</button></div>}<label className="toggle-row"><input type="checkbox" checked={hasPoll} onChange={(event) => setHasPoll(event.target.checked)}/> 투표 추가하기</label><button className="primary" onClick={submit} disabled={!title.trim() || !body.trim()}>{mode === 'edit' ? '수정 저장' : '게시판 열기'}</button></AppShell>
}

export function CreateBoardScreen() { return <BoardForm mode="create"/> }
export function EditBoardScreen() { return <BoardForm mode="edit"/> }

function EmptyState({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><strong>{title}</strong><button className="secondary-button" onClick={onAction}>{action}</button></div>
}
