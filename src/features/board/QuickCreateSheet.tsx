import { useRef, useState } from 'react'
import { Camera, MapPin, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { useApp } from '../../context/AppContext'
import type { Category } from '../../types/domain'
import { categoryLabel } from '../../domain/labels'
import { AuthorToggle, nearbyRange, readImage, usePublishGuard } from './WriteGuards'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

export function QuickCreateSheet({ onClose }: { onClose: () => void }) {
  const { createBoard, go, inRange, nearbyUserCount } = useApp()
  const { guard, dialog } = usePublishGuard()
  const [category, setCategory] = useState<Category>('긴급 사고')
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [image, setImage] = useState<{ name: string; url: string }>()
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const content = body.trim()
    if (!content) return
    const title = content.split(/\n|[.!?。！？]/)[0].trim().slice(0, 50) || `${category} 상황 공유`
    guard(content, category, () => createBoard({ category, title, body: content, imageName: image?.name, imageUrl: image?.url, anonymous }))
  }
  const pickImage = async (file?: File) => { if (file) setImage({ name: file.name, url: await readImage(file) }) }

  return <div className="quick-compose-layer" role="dialog" aria-modal="true" aria-label="빠른 글쓰기">
    <button className="quick-compose-backdrop" onClick={onClose} aria-label="글쓰기 닫기"/>
    <section className="quick-compose-sheet">
      <div className="quick-compose-grabber"/>
      <header><div><h2>지금 무슨 일이 있나요?</h2><p><MapPin size={13}/>주변 150m · {nearbyRange(nearbyUserCount)}이 볼 수 있어요</p></div><IconButton className="quick-compose-close" label="닫기" onClick={onClose}><X size={21}/></IconButton></header>
      {!inRange ? <div className="quick-compose-blocked"><strong>현재 위치에서는 글을 작성할 수 없어요</strong><p>150m 참여 범위 안에서 다시 시도해 주세요.</p><button onClick={() => { onClose(); go('home') }}>지도로 돌아가기</button></div> : <>
        <div className="quick-category-grid">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} data-category={item} onClick={() => setCategory(item)}>{categoryLabel[item]}</button>)}</div>
        <label className="quick-field quick-detail-field"><span>상세 내용</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="무슨 일이 있었는지 자세히 알려주세요" maxLength={500}/></label>
        {image ? <div className="write-photo-preview"><img src={image.url} alt="첨부할 현장 사진"/><IconButton className="write-photo-remove" label="첨부 사진 삭제" onClick={() => setImage(undefined)}><X size={16}/></IconButton></div> : <button className="quick-photo-button" onClick={() => fileRef.current?.click()}><Camera size={19}/>사진 추가</button>}
        <input ref={fileRef} className="quick-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickImage(event.target.files?.[0])}/>
        <div className="write-author-row"><span>작성자 표시</span><AuthorToggle anonymous={anonymous} onChange={setAnonymous}/></div>
        <Button className="quick-submit" onClick={submit} disabled={!body.trim()}>게시하기</Button>
      </>}
    </section>
    {dialog}
  </div>
}
