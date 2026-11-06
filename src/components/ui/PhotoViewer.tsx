import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { X } from 'lucide-react'

// 사진 크게 보기: 어두운 바탕 위에 원본 비율 그대로. 열 때는 바탕이 서서히 어두워지며 사진이 살짝 커지며 나타나고, 닫을 때는 반대로
// 바탕 · 사진 · 닫기 버튼 어디를 눌러도 닫힌다. 꾹 눌러 연 손가락이 그대로 있어도 사진이 선택(파란 칠)되지 않게 막는다
const CLOSE_MS = 180

export function PhotoViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    window.getSelection()?.removeAllRanges()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const close = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(onClose, CLOSE_MS)
  }
  return <div className={`photo-viewer ${closing ? 'closing' : ''}`} role="dialog" aria-modal="true" aria-label="사진 크게 보기" onClick={close} onContextMenu={(event) => event.preventDefault()}>
    <button className="photo-viewer-close" aria-label="사진 닫기"><X size={20} strokeWidth={2.4}/></button>
    <img src={src} alt={alt} draggable={false}/>
  </div>
}

// 꾹 누르기: 0.45초 누르고 있으면 실행. 손가락이 움직이면(스크롤) 취소한다
export function useLongPress(onLongPress: () => void, delay = 450) {
  const timer = useRef<number | undefined>(undefined)
  const start = useRef({ x: 0, y: 0 })
  const cancel = () => { window.clearTimeout(timer.current); timer.current = undefined }
  return {
    onPointerDown: (event: PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY }
      cancel()
      timer.current = window.setTimeout(() => { timer.current = undefined; navigator.vibrate?.(10); onLongPress() }, delay)
    },
    onPointerMove: (event: PointerEvent) => { if (timer.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancel() },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // 길게 누를 때 뜨는 브라우저 메뉴(이미지 저장 등) 대신 크게 보기
    onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
  }
}
