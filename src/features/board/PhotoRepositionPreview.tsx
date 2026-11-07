import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { ImageFocus } from '../../types/domain'

// 글쓰기 사진 미리보기 + 위치 변경 (노션 커버 '위치 변경'과 같은 방식).
// 목록 · 상세 · 지도 시트는 사진을 좁은 칸에 잘라 보여 줘서, 보일 부분(focus, 가로 · 세로 %)을 고른다.
// - 평소: 누르면 다른 사진으로 바꾸기, 오른쪽 위 [위치 조정]
// - 위치 조정 중: 가운데 '이미지 드래그해서 재배치', 끌면 사진이 따라오고 [위치 저장] · [취소]
// 크게 보기(사진 누르기)는 늘 원본 전체라 여기서 고른 위치와 상관없다
export const CENTER: ImageFocus = { x: 50, y: 50 }
const clamp = (value: number) => Math.min(100, Math.max(0, value))

export function PhotoRepositionPreview({ src, focus, onFocusChange, onChangePhoto }: {
  src: string
  focus: ImageFocus
  onFocusChange: (focus: ImageFocus) => void
  onChangePhoto: () => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [editing, setEditing] = useState(false)
  // 위치 변경 중 고르는 값 (저장 전까지는 바깥 값을 바꾸지 않는다)
  const [draft, setDraft] = useState(focus)
  const drag = useRef<{ x: number; y: number; from: ImageFocus; rangeX: number; rangeY: number } | null>(null)
  const shown = editing ? draft : focus

  // 사진이 칸보다 넘치는 길이(px). object-fit: cover라 한쪽 방향만 넘친다
  const overflow = () => {
    const frame = frameRef.current!.getBoundingClientRect()
    const img = imgRef.current!
    const scale = Math.max(frame.width / img.naturalWidth, frame.height / img.naturalHeight)
    return { x: img.naturalWidth * scale - frame.width, y: img.naturalHeight * scale - frame.height }
  }
  const onPointerDown = (event: PointerEvent) => {
    if (!editing) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const { x, y } = overflow()
    drag.current = { x: event.clientX, y: event.clientY, from: draft, rangeX: x, rangeY: y }
  }
  const onPointerMove = (event: PointerEvent) => {
    const state = drag.current
    if (!state) return
    // 사진을 아래로 끌면 위쪽이 더 보인다 → 세로 위치(%)가 줄어든다
    setDraft({
      x: state.rangeX > 1 ? clamp(state.from.x - (event.clientX - state.x) / state.rangeX * 100) : state.from.x,
      y: state.rangeY > 1 ? clamp(state.from.y - (event.clientY - state.y) / state.rangeY * 100) : state.from.y,
    })
  }
  const onPointerUp = () => { drag.current = null }

  const startEditing = () => { setDraft(focus); setEditing(true) }
  const save = () => { onFocusChange({ x: Math.round(draft.x), y: Math.round(draft.y) }); setEditing(false) }

  return <div className={`quick-photo-preview ${editing ? 'repositioning' : ''}`}>
    <div ref={frameRef} className="quick-photo-change" role={editing ? undefined : 'button'} tabIndex={editing ? -1 : 0} aria-label={editing ? undefined : '다른 사진으로 바꾸기'}
      onClick={() => { if (!editing) onChangePhoto() }} onKeyDown={(event) => { if (!editing && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onChangePhoto() } }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <img ref={imgRef} src={src} alt="올릴 사진 미리보기" draggable={false} style={{ objectPosition: `${shown.x}% ${shown.y}%` }}/>
      {editing && <span className="photo-reposition-hint" aria-live="polite">이미지 드래그해서 재배치</span>}
    </div>
    <div className="photo-reposition-actions">
      {editing
        ? <><button onClick={save}>위치 저장</button><i aria-hidden="true"/><button onClick={() => setEditing(false)}>취소</button></>
        : <button onClick={startEditing}>위치 조정</button>}
    </div>
  </div>
}
