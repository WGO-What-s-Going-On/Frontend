import { useEffect, useRef, useState } from 'react'
import { Camera, Info, MapPin, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { canViewTransition, useApp } from '../../context/AppContext'
import { reachOptions } from '../../types/domain'
import type { Board, Category, Reach } from '../../types/domain'
import { categoryLabel } from '../../domain/labels'
import { AuthorToggle } from './AuthorToggle'
import { SimilarBoardsSheet } from './SimilarBoardsSheet'
import { findSimilarBoards } from './similarBoards'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

export function QuickCreateSheet({ onClose }: { onClose: () => void }) {
  const { boards, createBoard, go, inRange } = useApp()
  const [category, setCategory] = useState<Category>('긴급 사고')
  const [body, setBody] = useState('')
  const [imageName, setImageName] = useState<string>()
  const [anonymous, setAnonymous] = useState(false)
  const [reach, setReach] = useState<Reach>(150)
  const [reachTip, setReachTip] = useState(false)
  const reachTipRef = useRef<HTMLSpanElement>(null)
  // 게시하기를 눌렀을 때 찾은 비슷한 글 (있으면 올리기 전에 먼저 보여준다)
  const [similar, setSimilar] = useState<Board[] | null>(null)
  const [publishing, setPublishing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!reachTip) return
    const close = (event: PointerEvent) => { if (!reachTipRef.current?.contains(event.target as Node)) setReachTip(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [reachTip])

  const submit = () => {
    const content = body.trim()
    if (!content) return
    const found = findSimilarBoards(boards, { category, body: content })
    if (found.length) { setSimilar(found); return }
    publishNow()
  }
  const publishNow = () => {
    const content = body.trim()
    setSimilar(null)
    const title = content.split(/\n|[.!?。！？]/)[0].trim().slice(0, 50) || `${category} 상황 공유`
    const publish = () => createBoard({ category, title, body: content, imageName, anonymous, reach })
    // 겹쳐 전환이 되면 작성 시트에서 바로 상세로 넘어가고, 안 되면 시트를 먼저 살짝 떠오르며 지운다
    if (canViewTransition()) { publish(); return }
    setPublishing(true)
    window.setTimeout(publish, 140)
  }

  return <div className={`quick-compose-layer ${publishing ? 'publishing' : ''}`} role="dialog" aria-modal="true" aria-label="빠른 글쓰기">
    <button className="quick-compose-backdrop" onClick={onClose} aria-label="글쓰기 닫기"/>
    <section className="quick-compose-sheet">
      <div className="quick-compose-grabber"/>
      <header><div><h2>지금 무슨 일이 있나요?</h2><p><MapPin size={13}/>주변 {reach}m에 게시</p></div><IconButton className="quick-compose-close" label="닫기" onClick={onClose}><X size={21}/></IconButton></header>
      {!inRange ? <div className="quick-compose-blocked"><strong>현재 위치에서는 글을 작성할 수 없어요</strong><p>150m 참여 범위 안에서 다시 시도해 주세요.</p><button onClick={() => { onClose(); go('home') }}>지도로 돌아가기</button></div> : <>
        <div className="quick-category-grid">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} data-category={item} onClick={() => setCategory(item)}>{categoryLabel[item]}</button>)}</div>
        <label className="quick-field quick-detail-field"><span>상세 내용</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="무슨 일이 있었는지 자세히 알려주세요" maxLength={500}/></label>
        <button className="quick-photo-button" onClick={() => fileRef.current?.click()}><Camera size={19}/>{imageName || '사진 추가'}</button>
        <input ref={fileRef} className="quick-file-input" type="file" accept="image/*" onChange={(event) => setImageName(event.target.files?.[0]?.name)}/>
        {/* 공개 범위: 작성자 표시와 같은 모양의 한 줄. i를 누르면 짧은 안내 */}
        <div className="write-author-row reach-row"><span ref={reachTipRef} className="reach-label">공개 범위<button className="reach-info" aria-label="공개 범위 안내" aria-expanded={reachTip} onClick={() => setReachTip(!reachTip)}><Info size={14}/></button>{reachTip && <span className="reach-tip" role="tooltip">작게 설정할수록 현장성 증가돼요</span>}</span><div className="author-toggle" role="radiogroup" aria-label="공개 범위">{reachOptions.map((option) => <button key={option} role="radio" aria-checked={reach === option} className={reach === option ? 'selected' : ''} onClick={() => setReach(option)}>{option}m</button>)}</div></div>
        <div className="write-author-row"><span>작성자 표시</span><AuthorToggle anonymous={anonymous} onChange={setAnonymous}/></div>
        <Button className="quick-submit" onClick={submit} disabled={!body.trim()} pending={publishing}>게시하기</Button>
      </>}
    </section>
    {similar && <SimilarBoardsSheet boards={similar} onClose={() => setSimilar(null)} onCancelWrite={onClose} onPublish={publishNow}/>}
  </div>
}
