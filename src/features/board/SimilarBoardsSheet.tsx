import { useState } from 'react'
import { ArrowLeft, ChevronRight, MapPin, X } from 'lucide-react'
import { IconButton } from '../../components/ui/IconButton'
import { useApp } from '../../context/AppContext'
import { categoryLabel } from '../../domain/labels'
import { isHotBoard } from '../../types/domain'
import type { Board } from '../../types/domain'

// 게시하기를 누르면 비슷한 진행 중 글을 화면 가운데 팝업으로 먼저 보여준다 (같은 일로 글이 여러 개 생기지 않게).
// 글을 눌러 안에서 바로 읽어 보고, 아래에서 작성 취소 · 그대로 올리기를 고른다. X는 작성 화면으로 돌아간다.
export function SimilarBoardsSheet({ boards, onClose, onCancelWrite, onPublish }: { boards: Board[]; onClose: () => void; onCancelWrite: () => void; onPublish: () => void }) {
  const { comments } = useApp()
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = boards.find((board) => board.id === openId)
  const boardComments = (id: string) => comments.filter((comment) => comment.boardId === id)
  const reactionCount = (board: Board) => Object.values(board.reactions).reduce((sum, count) => sum + count, 0)
  const tags = (board: Board) => <span className="similar-tags"><span className="feed-category" data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, boardComments(board.id).length) && <b className="board-tag tag-hot">HOT</b>}</span>

  return <div className="similar-layer" role="dialog" aria-modal="true" aria-label="비슷한 글">
    <div className="similar-backdrop" aria-hidden="true"/>
    <section className="similar-sheet">
      <header className="similar-head">
        {opened ? <IconButton className="similar-back" label="비슷한 글 목록으로" onClick={() => setOpenId(null)}><ArrowLeft size={20}/></IconButton>
          : <div><h2>비슷한 글이 이미 있어요</h2><p>같은 일이라면 이 글에 참여해 보세요</p></div>}
        <IconButton className="quick-compose-close" label="닫기" onClick={onClose}><X size={21}/></IconButton>
      </header>
      <div className="similar-body">{opened ? <article className="similar-preview">
        {tags(opened)}
        <h3>{opened.title}</h3>
        <div className="similar-byline"><span>{opened.authorName}</span><span>{opened.createdAt}</span><span><MapPin size={12}/>{opened.distance}m</span></div>
        <p>{opened.body}</p>
        {(opened.imagePlaceholder || opened.imageName) && <div className="board-image-placeholder similar-image">[이미지]</div>}
        <div className="similar-meta"><span>반응 {reactionCount(opened)}</span><span>댓글 {boardComments(opened.id).length}</span></div>
        {boardComments(opened.id).filter((comment) => !comment.parentId).slice(0, 2).map((comment) => <div key={comment.id} className="similar-comment"><strong>{comment.authorName}</strong><span>{comment.body || '[사진]'}</span></div>)}
      </article> : <div className="similar-list">{boards.map((board) => <button key={board.id} className="similar-item" onClick={() => setOpenId(board.id)}>
        <span className="similar-item-text">
          {tags(board)}
          <strong>{board.title}</strong>
          <span className="similar-item-body">{board.body}</span>
          <span className="similar-meta"><span>댓글 {boardComments(board.id).length}</span><span>{board.createdAt}</span><span>{board.distance}m</span></span>
        </span>
        <ChevronRight size={18} aria-hidden="true"/>
      </button>)}</div>}</div>
      <div className="similar-actions"><button className="similar-cancel" onClick={onCancelWrite}>작성 취소</button><button className="similar-publish" onClick={onPublish}>그대로 올리기</button></div>
    </section>
  </div>
}
