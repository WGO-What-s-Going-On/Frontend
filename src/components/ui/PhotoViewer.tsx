import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { PointerEvent, RefObject } from 'react'
import { Maximize2, X } from 'lucide-react'
import { haptic } from './haptics'
import { useStatusTint } from './statusTint'

// 사진 크게 보기 (iOS 사진 앱처럼): 화면 속 사진 자리에서 커지며 열리고, 닫을 때는 그 자리로 돌아가며 작아진다.
// - origin: 열기 전 사진이 있던 요소. 없으면 제자리에서 살짝 커지며 나타난다
// - 닫기: 바탕 · 사진을 탭, 사진 오른쪽 위 X, 아래로 끌어내리기, Esc
// - 꾹 눌러 연 손가락이 그대로 있어도 사진이 선택(파란 칠)되지 않게 막는다
const OPEN_MS = 340
const CLOSE_MS = 260
const OPEN_EASE = 'cubic-bezier(.2, .9, .3, 1)'
const CLOSE_EASE = 'cubic-bezier(.4, 0, .2, 1)'
const RADIUS = 12
const DISMISS_DRAG = 90

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 화면 속 사진 자리(잘린 미리보기)와 같은 위치 · 크기 · 잘림으로 보이게 하는 첫 장면
function originFrame(from: DOMRect, to: DOMRect) {
  const scale = Math.max(from.width / to.width, from.height / to.height)
  const cropX = Math.max(0, (to.width * scale - from.width) / 2 / scale)
  const cropY = Math.max(0, (to.height * scale - from.height) / 2 / scale)
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  return { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, clipPath: `inset(${cropY}px ${cropX}px round ${14 / scale}px)` }
}
// 사진 자리: 감싼 요소 안의 첫 요소(실제로 보이는 둥근 사진 칸)
const originRect = (origin?: RefObject<HTMLElement | null>) => {
  const element = origin?.current
  return ((element?.firstElementChild as HTMLElement | null) ?? element)?.getBoundingClientRect()
}
const restFrame = { transform: 'none', clipPath: `inset(0px 0px round ${RADIUS}px)` }

export function PhotoViewer({ src, alt, origin, onClose }: { src: string; alt: string; origin?: RefObject<HTMLElement | null>; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null)
  useStatusTint(backdropRef)
  // 사진 + X 한 묶음. 움직임은 이 묶음에 줘서 X가 늘 사진 오른쪽 위에 붙어 다닌다
  const frameRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closing = useRef(false)
  const drag = useRef<{ startY: number; dy: number; moved: boolean } | null>(null)
  // 끌었다 놓은 손가락이 탭(click)으로 이어져 바로 닫히지 않게
  const suppressClick = useRef(false)
  // 사진 묶음의 제자리 (움직임 없는 상태의 위치 · 크기)
  const restRect = () => {
    const frame = frameRef.current!
    const { transform } = frame.style
    frame.style.transform = 'none'
    const rect = imgRef.current!.getBoundingClientRect()
    frame.style.transform = transform
    return rect
  }

  useLayoutEffect(() => {
    window.getSelection()?.removeAllRanges()
    haptic()
    const img = imgRef.current!
    const open = () => {
      const frame = frameRef.current!
      const to = img.getBoundingClientRect()
      const from = originRect(origin)
      const fast = reducedMotion()
      frame.style.visibility = 'visible'
      backdropRef.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fast ? 1 : OPEN_MS * .8, easing: 'ease-out', fill: 'backwards' })
      // 끝나면 잘림(clip)을 풀어 사진 밖에 있는 X가 보이게 한다 (fill: backwards)
      frame.animate(from && !fast ? [originFrame(from, to), restFrame] : [{ ...restFrame, opacity: 0, transform: 'scale(.96)' }, restFrame], { duration: fast ? 1 : OPEN_MS, easing: OPEN_EASE, fill: 'backwards' })
      closeRef.current!.animate([{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: fast ? 1 : 180, delay: fast ? 0 : OPEN_MS, easing: 'ease-out', fill: 'backwards' })
    }
    // 사진 크기를 알아야 자리를 잡을 수 있어서 불러온 뒤에 연다 (대개 이미 받아 둔 사진이라 바로 열린다)
    if (img.complete && img.naturalWidth) open()
    else img.addEventListener('load', open, { once: true })
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => { img.removeEventListener('load', open); window.removeEventListener('keydown', onKey) }
  }, [])

  const close = () => {
    if (closing.current) return
    closing.current = true
    haptic()
    const frame = frameRef.current!
    const to = restRect()
    const from = originRect(origin)
    const fast = reducedMotion()
    // 끌어내리던 중이면 지금 모습에서 이어서 돌아간다
    const now = { transform: frame.style.transform || 'none', clipPath: restFrame.clipPath }
    frame.getAnimations().forEach((animation) => animation.cancel())
    frame.style.transform = ''
    closeRef.current!.style.opacity = '0'
    const back = from && !fast ? originFrame(from, to) : { ...restFrame, opacity: 0, transform: 'scale(.96)' }
    frame.animate([now, back], { duration: fast ? 1 : CLOSE_MS, easing: CLOSE_EASE, fill: 'forwards' })
    const backdrop = backdropRef.current!
    backdrop.getAnimations().forEach((animation) => animation.cancel())
    backdrop.animate([{ opacity: Number(backdrop.style.opacity || 1) }, { opacity: 0 }], { duration: fast ? 1 : CLOSE_MS, easing: CLOSE_EASE, fill: 'forwards' }).onfinish = onClose
  }

  // 아래(또는 위)로 끌면 사진이 따라오며 바탕이 옅어지고, 충분히 끌고 놓으면 닫힌다
  const onPointerDown = (event: PointerEvent) => { if (!closing.current) drag.current = { startY: event.clientY, dy: 0, moved: false } }
  const onPointerMove = (event: PointerEvent) => {
    const state = drag.current
    if (!state || closing.current) return
    state.dy = event.clientY - state.startY
    if (!state.moved && Math.abs(state.dy) < 6) return
    state.moved = true
    const frame = frameRef.current!
    frame.getAnimations().forEach((animation) => animation.cancel())
    frame.style.transform = `translateY(${state.dy}px) scale(${1 - Math.min(Math.abs(state.dy) / 1600, .12)})`
    backdropRef.current!.getAnimations().forEach((animation) => animation.cancel())
    backdropRef.current!.style.opacity = String(1 - Math.min(Math.abs(state.dy) / 360, .7))
    closeRef.current!.style.opacity = '0'
  }
  const onPointerUp = () => {
    const state = drag.current
    drag.current = null
    suppressClick.current = Boolean(state?.moved)
    if (!state?.moved || closing.current) return
    if (Math.abs(state.dy) > DISMISS_DRAG) { close(); return }
    // 조금만 끌었으면 제자리로
    const frame = frameRef.current!
    const from = frame.style.transform
    frame.style.transform = ''
    frame.animate([{ transform: from }, { transform: 'none' }], { duration: 220, easing: OPEN_EASE })
    const backdrop = backdropRef.current!
    backdrop.animate([{ opacity: Number(backdrop.style.opacity || 1) }, { opacity: 1 }], { duration: 220, easing: OPEN_EASE })
    backdrop.style.opacity = ''
    closeRef.current!.style.opacity = ''
  }
  const onClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return }
    close()
  }

  // 화면 맨 바깥(body)에 띄운다: 지도 시트처럼 움직임(transform)이 걸린 요소 안에서 열면 '화면 고정'이 그 요소 기준이 돼
  // 배경이 시트 크기로만 깔리고 사진이 엉뚱한 곳에 잘려 보였다
  return createPortal(<div className="photo-viewer" role="dialog" aria-modal="true" aria-label="사진 크게 보기"
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    onClick={onClick} onContextMenu={(event) => event.preventDefault()}>
    <div ref={backdropRef} className="photo-viewer-backdrop"/>
    <div ref={frameRef} className="photo-viewer-frame">
      <img ref={imgRef} src={src} alt={alt} draggable={false}/>
      <button ref={closeRef} className="photo-viewer-close" aria-label="사진 닫기" onClick={(event) => { event.stopPropagation(); close() }}><X size={18} strokeWidth={2.4}/></button>
    </div>
  </div>, document.body)
}

// 사진 오른쪽 위 확대 표시: 누르면 크게 볼 수 있다는 작은 힌트 (감싼 요소에 zoomable을 붙인다)
export function ZoomBadge() {
  return <span className="photo-zoom-badge" aria-hidden="true"><Maximize2 size={14} strokeWidth={2.2}/></span>
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
      timer.current = window.setTimeout(() => { timer.current = undefined; onLongPress() }, delay)
    },
    onPointerMove: (event: PointerEvent) => { if (timer.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancel() },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // 길게 누를 때 뜨는 브라우저 메뉴(이미지 저장 등) 대신 크게 보기
    onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
  }
}
