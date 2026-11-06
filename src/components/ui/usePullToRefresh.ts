import { useEffect, useRef, useState } from 'react'

// 맨 위에서 아래로 당겼다 놓으면 새로고침 (휴대폰은 손가락, 컴퓨터 미리보기는 마우스 끌기).
// 화면 스크롤 영역(.screen)에 붙는다. pull은 당긴 길이(px), refreshing이면 놓은 뒤 불러오는 중.
// onRefresh가 Promise를 돌려주면 끝날 때까지 돌고, 너무 빨리 끝나도 잠깐은 보여 준다
const TRIGGER = 64
const MAX_PULL = 96
const HOLD = 52
const MIN_SPIN = 600

export function usePullToRefresh(enabled: boolean, onRefresh: () => void | Promise<unknown>) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useRef(onRefresh)
  refresh.current = onRefresh

  useEffect(() => {
    const screen = document.querySelector<HTMLElement>('.screen')
    if (!enabled || !screen) return
    let start: { x: number; y: number } | null = null
    // 가로로 먼저 움직이면(카테고리 칩 넘기기 등) 이번 누름은 당기기로 보지 않는다
    let decided = false
    let current = 0
    let busy = false
    const move = (x: number, y: number) => {
      if (!start) return false
      const dx = x - start.x
      const distance = y - start.y
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(distance) < 6) return false
        decided = true
        if (Math.abs(dx) > Math.abs(distance)) { start = null; return false }
      }
      if (distance <= 0) { current = 0; setPull(0); return false }
      // 컴퓨터에서 마우스로 끌 때 글자가 선택되지 않게
      if (!current) { window.getSelection()?.removeAllRanges(); screen.style.userSelect = 'none' }
      // 당길수록 덜 따라오게 (고무줄처럼)
      current = Math.min(distance * .5, MAX_PULL)
      setPull(current)
      return true
    }
    const end = () => {
      if (!start) return
      start = null
      screen.style.userSelect = ''
      if (current < TRIGGER) { current = 0; setPull(0); return }
      busy = true
      setPull(HOLD)
      setRefreshing(true)
      const began = Date.now()
      Promise.resolve().then(() => refresh.current()).catch(() => undefined).finally(() => {
        window.setTimeout(() => {
          busy = false
          current = 0
          setRefreshing(false)
          setPull(0)
        }, Math.max(0, MIN_SPIN - (Date.now() - began)))
      })
    }
    const begin = (x: number, y: number) => { if (!busy && screen.scrollTop <= 0) { start = { x, y }; decided = false } }

    const touchStart = (event: TouchEvent) => begin(event.touches[0].clientX, event.touches[0].clientY)
    // 당기는 중에는 iOS 화면 전체가 끌려가지 않게 기본 스크롤을 막는다
    const touchMove = (event: TouchEvent) => { if (move(event.touches[0].clientX, event.touches[0].clientY) && event.cancelable) event.preventDefault() }
    const mouseDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as Element).closest('button, a, input, textarea')) return
      begin(event.clientX, event.clientY)
      if (!start) return
      const mouseMove = (moveEvent: PointerEvent) => { if (move(moveEvent.clientX, moveEvent.clientY)) moveEvent.preventDefault() }
      const mouseUp = () => { window.removeEventListener('pointermove', mouseMove); end() }
      window.addEventListener('pointermove', mouseMove)
      window.addEventListener('pointerup', mouseUp, { once: true })
    }
    screen.addEventListener('touchstart', touchStart, { passive: true })
    screen.addEventListener('touchmove', touchMove, { passive: false })
    screen.addEventListener('touchend', end)
    screen.addEventListener('touchcancel', end)
    screen.addEventListener('pointerdown', mouseDown)
    return () => {
      screen.removeEventListener('touchstart', touchStart)
      screen.removeEventListener('touchmove', touchMove)
      screen.removeEventListener('touchend', end)
      screen.removeEventListener('touchcancel', end)
      screen.removeEventListener('pointerdown', mouseDown)
    }
  }, [enabled])

  return { pull, refreshing, ready: pull >= TRIGGER }
}
