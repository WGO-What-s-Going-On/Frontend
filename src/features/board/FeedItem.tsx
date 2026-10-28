import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, MessageCircle, SmilePlus } from 'lucide-react'
import { reactionOptions } from '../../components/ui/PostReactions'
import { useApp } from '../../context/AppContext'
import { categoryLabel, reactionLabel } from '../../domain/labels'
import { isHotBoard, myReactions } from '../../types/domain'
import type { Board, Comment, PostReaction } from '../../types/domain'
import { voteStatus } from './commentVote'
import { RADIUS } from '../map/mapWorld'

// 읽기 전용(150m 밖) 표시: 선 아이콘보다 작고 단단해 보이는 채운 자물쇠
export function SolidLock({ size = 13, label = '읽기 전용' }: { size?: number; label?: string }) {
  return <svg className="feed-lock" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2.4"/><rect x="4" y="10" width="16" height="12" rx="3" fill="currentColor"/></svg>
}

// 피드 반응 판에 보이는 이름
const pickerLabel: Record<PostReaction, string> = { '저도 궁금해요': '궁금해요', '지금도 그래요': '진행 중', '도움 됐어요': '유익해요', '이제 끝났어요': '끝났어요' }

// 게시판 피드 보기의 글 하나. 글을 열지 않아도 본문 · 사진 · 반응 수 · 댓글 수가 보이고,
// 반응은 댓글 공감처럼 이모티콘 버튼 하나로 모아 두고, 누르면 4가지 반응 판이 뜬다 (150m 안 글만 고를 수 있음). 카드를 누르면 상세로
export function FeedItem({ board, comments }: { board: Board; comments: Comment[] }) {
  const { inRange, openBoard, reactToBoard, alertBoardIds, toggleBoardNotifications } = useApp()
  const muted = !alertBoardIds.includes(board.id)
  const canReact = inRange && board.distance <= RADIUS
  const voting = voteStatus(board, comments) === 'OPEN'
  const open = () => openBoard(board.id)
  const [picker, setPicker] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!picker) return
    const close = (event: PointerEvent) => { if (!actionsRef.current?.contains(event.target as Node)) setPicker(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [picker])
  const mine = myReactions(board)[0]
  const reactionTotal = Object.values(board.reactions).reduce((sum, count) => sum + count, 0)
  return <article className="feed-item">
    {/* 게시판 카드와 같은 알림 켜기/끄기 (기본 꺼짐, 켜면 파랑) */}
    <button className={`ux-board-alert feed-alert ${muted ? 'muted' : ''}`} onClick={() => toggleBoardNotifications(board.id)} aria-label={muted ? `${board.title} 알림 켜기` : `${board.title} 알림 끄기`} title={muted ? '알림 켜기' : '알림 끄기'}>{muted ? <BellOff size={17}/> : <Bell size={17}/>}</button>
    <button className="feed-main" onClick={open}>
      <span className="feed-meta"><span className="feed-category" data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, comments.length) && <b className="board-tag tag-hot">HOT</b>}{!canReact && <SolidLock/>}</span>
      <strong className="feed-title">{board.title}</strong>
      <span className="feed-body">{board.body}</span>
      {(board.imagePlaceholder || board.imageName) && <span className="board-image-placeholder feed-image">[이미지]</span>}
    </button>
    {/* 반응 버튼(무엇을 눌렀든 이모티콘 그대로, 내가 반응했으면 파랗게) + 반응 합계, 댓글 수. 버튼을 누르면 반응 판 */}
    <div ref={actionsRef} className="feed-actions">
      <button className={mine ? 'selected' : ''} onClick={() => setPicker(!picker)} aria-expanded={picker} aria-label={`반응 ${reactionTotal}개, 반응 남기기`}><SmilePlus size={21} strokeWidth={1.8}/><span>{reactionTotal}</span></button>
      <button onClick={open} aria-label={`댓글 ${comments.length}개`}><MessageCircle size={21} strokeWidth={1.8}/><span>{comments.length}</span></button>
      {/* 오른쪽 끝: 게시판 카드처럼 작성 시간 (투표 중이면 그 앞에) */}
      <span className="feed-side">{voting && <em>댓글 투표 중</em>}<small>{board.createdAt}</small></span>
      {picker && <div className="feed-reaction-picker" role="menu" aria-label="반응 고르기">{reactionOptions.map(({ label, icon: Icon }) => <button key={label} role="menuitemradio" aria-checked={mine === label} className={mine === label ? 'selected' : ''} disabled={!canReact} title={reactionLabel[label].full} onClick={() => { reactToBoard(board.id, label); setPicker(false) }}><Icon size={18} strokeWidth={2}/><span>{pickerLabel[label]}</span><b>{board.reactions[label]}</b></button>)}</div>}
    </div>
  </article>
}
