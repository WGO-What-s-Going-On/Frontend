import { useRef, useState } from 'react'
import { Camera, MapPin, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Category } from '../../types/domain'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

export function QuickCreateSheet({ onClose }: { onClose: () => void }) {
  const { createBoard, go, inRange } = useApp()
  const [category, setCategory] = useState<Category>('긴급 사고')
  const [body, setBody] = useState('')
  const [imageName, setImageName] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const content = body.trim()
    if (!content) return
    const title = content.split(/\n|[.!?。！？]/)[0].trim().slice(0, 50) || `${category} 상황 공유`
    createBoard({ category, title, body: content, imageName })
  }

  return <div className="quick-compose-layer" role="dialog" aria-modal="true" aria-label="빠른 글쓰기">
    <button className="quick-compose-backdrop" onClick={onClose} aria-label="글쓰기 닫기"/>
    <section className="quick-compose-sheet">
      <div className="quick-compose-grabber"/>
      <header><div><h2>지금 무슨 일이 있나요?</h2><p><MapPin size={13}/>주변 150m에 게시됩니다</p></div><button className="quick-compose-close" onClick={onClose} aria-label="닫기"><X size={21}/></button></header>
      {!inRange ? <div className="quick-compose-blocked"><strong>현재 위치에서는 글을 작성할 수 없어요</strong><p>150m 참여 범위 안에서 다시 시도해 주세요.</p><button onClick={() => { onClose(); go('home') }}>지도로 돌아가기</button></div> : <>
        <div className="quick-category-grid">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <label className="quick-field quick-detail-field"><span>상세 내용</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="무슨 일이 있었는지 자세히 알려주세요" maxLength={500}/></label>
        <button className="quick-photo-button" onClick={() => fileRef.current?.click()}><Camera size={19}/>{imageName || '사진 추가'}</button>
        <input ref={fileRef} className="quick-file-input" type="file" accept="image/*" onChange={(event) => setImageName(event.target.files?.[0]?.name)}/>
        <button className="quick-submit" onClick={submit} disabled={!body.trim()}>게시하기</button>
        <button className="quick-detailed" onClick={() => { onClose(); go('category') }}>제목까지 직접 쓰기</button>
      </>}
    </section>
  </div>
}
