import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Info, MapPin, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { useStatusTint } from '../../components/ui/statusTint'
import { useApp } from '../../context/AppContext'
import { reachOptions } from '../../types/domain'
import type { Board, Category, ImageFocus, Reach } from '../../types/domain'
import { categoryLabel } from '../../domain/labels'
import { CategoryIcon } from '../../domain/categoryIcons'
import { AuthorToggle } from './AuthorToggle'
import { CENTER, PhotoRepositionPreview } from './PhotoRepositionPreview'
import { SimilarBoardsSheet } from './SimilarBoardsSheet'
import { MovingDialog } from './MovingDialog'
import { isMovingError } from '../../api/posts'
import { findSimilarBoards } from './similarBoards'
import { imageProblem } from '../../api/media'

const categories: Category[] = ['긴급 사고', '도움 요청', '동네 소식', '일상 불편']

export function QuickCreateSheet({ onClose }: { onClose: () => void }) {
  const { boards, createBoard, go, inRange, live, findSimilar, showToast, keepLocationFresh } = useApp()
  const [category, setCategory] = useState<Category>('긴급 사고')
  const [body, setBody] = useState('')
  const [imageName, setImageName] = useState<string>()
  const [imageFile, setImageFile] = useState<File>()
  // 잘린 칸에 보일 사진 위치 (위치 조정으로 고른다, 새 사진을 고르면 가운데로)
  const [imageFocus, setImageFocus] = useState<ImageFocus>(CENTER)
  const removePhoto = () => { setImageFile(undefined); setImageName(undefined); setImageFocus(CENTER); if (fileRef.current) fileRef.current.value = '' }
  // 게시 진행 단계 (null이면 아직 안 누름)
  const [stage, setStage] = useState<'check' | 'upload' | 'post' | null>(null)
  // 고른 사진 미리보기 (이 기기에서만 쓰는 임시 주소, 바꾸거나 닫으면 지운다)
  const previewUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : undefined, [imageFile])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  const [anonymous, setAnonymous] = useState(false)
  const [reach, setReach] = useState<Reach>(150)
  const [reachTip, setReachTip] = useState(false)
  const reachTipRef = useRef<HTMLSpanElement>(null)
  // 게시하기를 눌렀을 때 찾은 비슷한 글 (있으면 올리기 전에 먼저 보여준다)
  const [similar, setSimilar] = useState<Board[] | null>(null)
  // 이동 중이라 글쓰기가 막혔을 때 안내 창
  const [moving, setMoving] = useState(false)
  // 쓰는 동안 위치를 7초마다 보낸다: 버스에서 내린 뒤처럼 이동 기록이 남아 있어도, 쓰는 사이 서버가 정지를 확인해 게시할 때 막히지 않게
  useEffect(() => keepLocationFresh(7000), [])
  // 비슷한 글 확인 · 사진 업로드 · 서버 저장 중 (버튼만 막고 시트는 그대로)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const backdrop = useRef<HTMLButtonElement>(null)
  useStatusTint(backdrop)

  useEffect(() => {
    if (!reachTip) return
    const close = (event: PointerEvent) => { if (!reachTipRef.current?.contains(event.target as Node)) setReachTip(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [reachTip])

  // 게시하기: 비슷한 진행 중 글이 있으면 먼저 보여준다 (서버 연동 중이면 서버가 판별, 실패하면 그냥 올린다)
  const submit = async () => {
    const content = body.trim()
    if (!content || busy) return
    setBusy(true)
    // 사진이 있으면 처음부터 '사진 올리는 중' (비슷한 글 확인은 따로 보여 주지 않는다)
    setStage(imageFile ? 'upload' : 'check')
    const title = content.split(/\n|[.!?。！？]/)[0].trim().slice(0, 50) || `${category} 상황 공유`
    // 이동 중이면 비슷한 글 확인부터 막힌다: 사진을 올리기 전에 바로 안내한다 (그 밖의 확인 실패는 그냥 올린다)
    const found = live ? await findSimilar({ category, title, body: content, reach }).catch((error) => isMovingError(error) ? 'moving' as const : []) : findSimilarBoards(boards, { category, body: content })
    if (found === 'moving') { setBusy(false); setStage(null); setMoving(true); return }
    if (found.length) { setSimilar(found); setBusy(false); setStage(null); return }
    publishNow()
  }
  // 올리는 동안 시트는 그대로 두고 버튼에서 진행을 보여 준다 (사진이 있으면 '사진 올리는 중' → '게시하는 중', 없으면 '게시하는 중').
  // 끝나면 상세로 넘어가고, 실패하면 쓴 내용 그대로 다시 누를 수 있다
  const publishNow = () => {
    const content = body.trim()
    setBusy(true)
    setSimilar(null)
    setStage(imageFile ? 'upload' : 'post')
    const title = content.split(/\n|[.!?。！？]/)[0].trim().slice(0, 50) || `${category} 상황 공유`
    Promise.resolve(createBoard({ category, title, body: content, imageName, imageFile, imageFocus: imageFile ? imageFocus : undefined, anonymous, reach, onStage: setStage }))
      .catch((error) => { setBusy(false); setStage(null); if (isMovingError(error)) setMoving(true) })
  }
  // 올리는 중에는 닫지 않는다 (닫아도 올리기는 계속돼 나중에 갑자기 상세로 넘어가게 된다)
  const close = () => { if (!stage) onClose() }

  return <div className="quick-compose-layer" role="dialog" aria-modal="true" aria-label="빠른 글쓰기">
    <button ref={backdrop} className="quick-compose-backdrop" onClick={close} aria-label="글쓰기 닫기"/>
    <section className="quick-compose-sheet">
      <div className="quick-compose-grabber"/>
      <header><div><h2>지금 무슨 일이 있나요?</h2><p><MapPin size={13}/>주변 {reach}m에 게시</p></div><IconButton className="quick-compose-close" label="닫기" onClick={close} disabled={Boolean(stage)}><X size={21}/></IconButton></header>
      {!inRange ? <div className="quick-compose-blocked"><strong>현재 위치에서는 글을 작성할 수 없어요</strong><p>150m 참여 범위 안에서 다시 시도해 주세요.</p><button onClick={() => { onClose(); go('home') }}>지도로 돌아가기</button></div> : <>
        <div className="quick-category-grid">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} data-category={item} onClick={() => setCategory(item)}><CategoryIcon category={item}/>{categoryLabel[item]}</button>)}</div>
        <label className="quick-field quick-detail-field"><span>상세 내용</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="무슨 일이 있었는지 자세히 알려주세요" maxLength={500}/></label>
        {/* 사진을 고르면 미리보기로 바뀐다. 미리보기를 누르면 다른 사진으로 바꾸고, 오른쪽 위 X로 뺀다 */}
        {previewUrl
          ? <PhotoRepositionPreview src={previewUrl} focus={imageFocus} onFocusChange={setImageFocus} onChangePhoto={() => fileRef.current?.click()} onRemove={removePhoto}/>
          : <button className="quick-photo-button" onClick={() => fileRef.current?.click()}><Camera size={19}/>{imageName || '사진 추가'}</button>}
        <input ref={fileRef} className="quick-file-input" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; const problem = file && imageProblem(file); if (problem) { showToast(problem); event.target.value = ''; return } setImageFile(file); setImageFocus(CENTER); setImageName(file?.name) }}/>
        {/* 공개 범위: 작성자 표시와 같은 모양의 한 줄. i를 누르면 짧은 안내 */}
        <div className="write-author-row reach-row"><span ref={reachTipRef} className="reach-label">공개 범위<button className="reach-info" aria-label="공개 범위 안내" aria-expanded={reachTip} onClick={() => setReachTip(!reachTip)}><Info size={14}/></button>{reachTip && <span className="reach-tip" role="tooltip">작게 설정할수록 현장성 증가돼요</span>}</span><div className="author-toggle" role="radiogroup" aria-label="공개 범위">{reachOptions.map((option) => <button key={option} role="radio" aria-checked={reach === option} className={reach === option ? 'selected' : ''} onClick={() => setReach(option)}>{option}m</button>)}</div></div>
        <div className="write-author-row"><span>작성자 표시</span><AuthorToggle anonymous={anonymous} onChange={setAnonymous}/></div>
        <div className="quick-submit-bar">
          <Button className="quick-submit" onClick={submit} disabled={!body.trim()} pending={busy}>{stage ? <span className="quick-submit-progress"><span className="spinner" aria-hidden="true"/>{stage === 'upload' ? '사진 올리는 중' : '게시하는 중'}</span> : '게시하기'}</Button>
        </div>
      </>}
    </section>
    {moving && <MovingDialog onClose={() => setMoving(false)} onRetry={() => { setMoving(false); publishNow() }}/>}
    {similar && <SimilarBoardsSheet boards={similar} onClose={() => setSimilar(null)} onCancelWrite={() => setSimilar(null)} onPublish={publishNow}/>}
  </div>
}
