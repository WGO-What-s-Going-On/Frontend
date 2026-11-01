import type { Board } from '../../types/domain'

// 게시글 사진 자리. 서버 사진(imageUrl)이 있으면 사진, 목업 글은 [이미지] 자리표시
export function hasBoardImage(board: Board) {
  return Boolean(board.imageUrl || board.imagePlaceholder || board.imageName)
}

export function BoardImage({ board, variant, block = false }: { board: Board; variant: string; block?: boolean }) {
  if (!hasBoardImage(board)) return null
  const Tag = block ? 'div' : 'span'
  if (board.imageUrl) return <Tag className={`board-image-placeholder board-photo ${variant}`}><img src={board.imageUrl} alt="현장 사진" loading="lazy"/></Tag>
  return <Tag className={`board-image-placeholder ${variant}`}>[이미지]</Tag>
}
