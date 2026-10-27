import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, MessageCircle, SmilePlus, X } from 'lucide-react'
import { IconButton } from '../../components/ui/IconButton'
import { useApp } from '../../context/AppContext'
import { categoryLabel } from '../../domain/labels'
import { isHotBoard } from '../../types/domain'
import type { Board } from '../../types/domain'

// 게시하기를 누르면 비슷한 진행 중 글을 화면 가운데 팝업으로 먼저 보여준다 (같은 일로 글이 여러 개 생기지 않게).
// 글을 눌러 안에서 바로 읽어 보고(같은 일인지만 보면 되니 본문 · 사진만), 아래에서 작성 취소 · 그대로 올리기를 고른다. X는 작성 화면으로 돌아간다.
// 목록과 글 보기는 같은 크기: 목록일 때 잰 높이로 고정하고, 글이 길면 팝업 안에서 스크롤
export function SimilarBoardsSheet({ boards, onClose, onCancelWrite, onPublish }: { boards: Board[]; onClose: () => void; onCancelWrite: () => void; onPublish: () => void }) {
  const { comments } = useApp()
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = boards.find((board) => board.id === openId)
  const sheetRef = useRef<HTMLElement>(null)
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => { if (!openId && sheetRef.current) setHeight(sheetRef.current.offsetHeight) }, [openId, boards])
  const boardComments = (id: string) => comments.filter((comment) => comment.boardId === id)
  const reactionCount = (board: Board) => Object.values(board.reactions).reduce((sum, count) => sum + count, 0)
  // 반응 · 댓글 수는 피드처럼 아이콘 + 숫자, 오른쪽 끝에 작성 시간
  const stats = (board: Board) => <span className="similar-stats"><span aria-label={`반응 ${reactionCount(board)}개`}><SmilePlus size={16} strokeWidth={1.8}/>{reactionCount(board)}</span><span aria-label={`댓글 ${boardComments(board.id).length}개`}><MessageCircle size={16} strokeWidth={1.8}/>{boardComments(board.id).length}</span><small>{board.createdAt}</small></span>
  const tags = (board: Board) => <span className="similar-tags"><span className="feed-category" data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, boardComments(board.id).length) && <b className="board-tag tag-hot">HOT</b>}</span>

  return <div className="similar-layer" role="dialog" aria-modal="true" aria-label="비슷한 글">
    <div className="similar-backdrop" aria-hidden="true"/>
    <section ref={sheetRef} className="similar-sheet" style={opened ? { height } : undefined}>
      <header className="similar-head">
        {opened ? <IconButton className="similar-back" label="비슷한 글 목록으로" onClick={() => setOpenId(null)}><ArrowLeft size={20}/></IconButton>
          : <h2>비슷한 글이 이미 있어요</h2>}
        <IconButton className="quick-compose-close" label="닫기" onClick={onClose}><X size={21}/></IconButton>
      </header>
      <div className="similar-body">{opened ? <article className="similar-preview">
        {tags(opened)}
        <h3>{opened.title}</h3>
        <p>{opened.body}</p>
        {(opened.imagePlaceholder || opened.imageName) && <div className="board-image-placeholder similar-image">[이미지]</div>}
        {stats(opened)}
      </article> : <div className="similar-list">{boards.map((board) => <button key={board.id} className="similar-item" onClick={() => setOpenId(board.id)}>
        <span className="similar-item-text">
          {/* 목록은 같은 일인지 훑어보는 용도라 반응 · 댓글 수는 빼고 작성 시간만 태그 줄 오른쪽에 */}
          <span className="similar-item-top">{tags(board)}<small>{board.createdAt}</small></span>
          <strong>{board.title}</strong>
          <span className="similar-item-body">{board.body}</span>
        </span>
        <ChevronRight size={18} aria-hidden="true"/>
      </button>)}</div>}</div>
      <div className="similar-actions"><button className="similar-cancel" onClick={onCancelWrite}>작성 취소</button><button className="similar-publish" onClick={onPublish}>그대로 올리기</button></div>
    </section>
  </div>
}
