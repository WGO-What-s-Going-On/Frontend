import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { X } from 'lucide-react'

// 사진 크게 보기: 어두운 바탕에 원본 비율 그대로. 바탕이나 닫기 버튼을 누르면 닫힌다
export function PhotoViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return <div className="comment-photo-modal" role="dialog" aria-label="사진 크게 보기" onClick={onClose}>
    <button aria-label="사진 닫기"><X size={22}/></button>
    <img src={src} alt={alt}/>
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
