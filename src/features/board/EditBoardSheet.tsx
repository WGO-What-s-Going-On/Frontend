import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { useApp } from '../../context/AppContext'
import { categoryLabel } from '../../domain/labels'
import type { Board, Category } from '../../types/domain'
import { AuthorToggle } from './AuthorToggle'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

// 게시글 수정: 글쓰기 시트와 같은 모양으로 상세 화면 위에 바로 열린다. 카테고리 · 제목 · 내용 · 작성자 표시를 한 화면에서 고친다.
export function EditBoardSheet({ board, canEdit, onClose }: { board: Board; canEdit: boolean; onClose: () => void }) {
  const { updateBoard } = useApp()
  const [category, setCategory] = useState<Category>(board.category)
  const [title, setTitle] = useState(board.title)
  const [body, setBody] = useState(board.body)
  const wasAnonymous = Boolean(board.anonymous) || board.authorName === '익명'
  const [anonymous, setAnonymous] = useState(wasAnonymous)
  const changed = title.trim() !== board.title || body.trim() !== board.body || category !== board.category || anonymous !== wasAnonymous
  const save = () => {
    if (!title.trim() || !body.trim()) return
    updateBoard(board.id, { title: title.trim(), body: body.trim(), category, anonymous })
    onClose()
  }
  return <div className="quick-compose-layer" role="dialog" aria-modal="true" aria-label="게시글 수정">
    <button className="quick-compose-backdrop" onClick={onClose} aria-label="수정 닫기"/>
    <section className="quick-compose-sheet edit-sheet">
      <div className="quick-compose-grabber"/>
      <header><h2>게시글 수정</h2><IconButton className="quick-compose-close" label="닫기" onClick={onClose}><X size={21}/></IconButton></header>
      {!canEdit ? <div className="quick-compose-blocked"><strong>지금 위치에서는 수정할 수 없어요</strong><p>150m 참여 범위 안에서 다시 시도해 주세요.</p><button onClick={onClose}>닫기</button></div> : <>
        <div className="quick-category-grid">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} data-category={item} onClick={() => setCategory(item)}>{categoryLabel[item]}</button>)}</div>
        <label className="quick-field"><span>제목</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={50}/></label>
        <label className="quick-field quick-detail-field"><span>내용</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={500}/></label>
        <div className="write-author-row"><span>작성자 표시</span><AuthorToggle anonymous={anonymous} onChange={setAnonymous}/></div>
        <Button className="quick-submit" onClick={save} disabled={!changed || !title.trim() || !body.trim()}>수정 완료</Button>
      </>}
    </section>
  </div>
}
