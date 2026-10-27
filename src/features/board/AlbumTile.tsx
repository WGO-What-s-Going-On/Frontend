import { categoryLabel } from '../../domain/labels'
import { isHotBoard } from '../../types/domain'
import type { Board } from '../../types/domain'
import { SolidLock } from './FeedItem'

// 게시판 앨범 보기의 칸 하나 (한 줄에 2개, 모든 칸 높이 같음). 한눈에 훑어보는 용도라 조회수 · 알림 종은 뺐다.
// 사진이 있으면 사진 + 제목 한 줄, 없으면 그 자리에 제목 2줄 + 본문 3줄
export function AlbumTile({ board, commentCount, readOnly, onOpen }: { board: Board; commentCount: number; readOnly: boolean; onOpen: () => void }) {
  const hasImage = Boolean(board.imagePlaceholder || board.imageName)
  return <button className={`album-tile ${hasImage ? 'has-image' : ''}`} onClick={onOpen}>
    <span className="album-tags"><span className="feed-category" data-category={board.category}>{categoryLabel[board.category]}</span>{isHotBoard(board, commentCount) && <b className="board-tag tag-hot">HOT</b>}{readOnly && <SolidLock/>}</span>
    {hasImage && <span className="board-image-placeholder album-image">[이미지]</span>}
    <strong className="album-title">{board.title}</strong>
    {!hasImage && <span className="album-body">{board.body}</span>}
    <span className="album-meta"><span>댓글 {commentCount}</span><span>{board.createdAt}</span></span>
  </button>
}
