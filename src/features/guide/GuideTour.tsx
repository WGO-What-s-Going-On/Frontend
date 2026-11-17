import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { categoryIcon } from '../../domain/categoryIcons'
import mascotHead from '../../assets/mascot/head.webp'

// 지도 둘러보기: 화면을 어둡게 하고 실제 버튼 자리만 밝게 뚫어, 마스코트 말풍선으로 하나씩 짚어 준다.
// 말풍선의 '다음'이나 어두운 곳 아무 데나 누르면 넘어간다. 지도가 늦게 뜨면(위치 권한 창 등) 짚을 곳이 생길 때까지 보이지 않게 기다린다
type Rect = { x: number; y: number; w: number; h: number }
interface Step {
  id: 'radius' | 'pin' | 'compose' | 'board' | 'bell'
  title: string
  body: string
  shape: 'circle' | 'round'
  pad: number
  find: (phone: HTMLElement) => Element | null
}

// 핀 단계: 화면 안에 보이는 실제 핀 중 내 위치에 가장 가까운 것. 없으면 예시 핀(.tour-demo-pin)
function findPin(phone: HTMLElement) {
  const frame = phone.getBoundingClientRect()
  const top = phone.querySelector('.map-top-overlay')?.getBoundingClientRect().bottom ?? frame.top
  const bottom = phone.querySelector('.bottom-nav')?.getBoundingClientRect().top ?? frame.bottom
  const me = phone.querySelector('.map-me')?.getBoundingClientRect()
  const center = me ? { x: me.left + me.width / 2, y: me.top + me.height / 2 } : { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 }
  const pins = [...phone.querySelectorAll('.map-canvas .map-marker')].filter((pin) => {
    const box = pin.getBoundingClientRect()
    return box.top > top + 12 && box.bottom < bottom - 190 && box.left > frame.left + 16 && box.right < frame.right - 16
  })
  const distance = (pin: Element) => { const box = pin.getBoundingClientRect(); return Math.hypot(box.left + box.width / 2 - center.x, box.top + box.height / 2 - center.y) }
  return pins.sort((a, b) => distance(a) - distance(b))[0] ?? phone.querySelector('.tour-demo-pin')
}

const STEPS: Step[] = [
  { id: 'radius', title: '내 주변 150m', body: '파란 원 안에서 올라온 글이 지도에 핀으로 떠요. 내가 움직이면 원도 같이 움직여요.', shape: 'circle', pad: 0, find: (phone) => phone.querySelector('.map-radius-probe, .map-radius') },
  { id: 'pin', title: '핀을 누르면', body: '무슨 일인지 아래에 바로 요약돼요. 숫자가 붙은 핀은 같은 자리에 글이 여러 개예요.', shape: 'circle', pad: 12, find: findPin },
  { id: 'compose', title: '지금 보이는 걸 올려요', body: '사진 한 장, 한 줄이면 충분해요. 150m 안에 있을 때 올릴 수 있어요.', shape: 'circle', pad: 6, find: (phone) => phone.querySelector('.compose-fab') },
  { id: 'board', title: '목록으로 모아 보기', body: '주변 글을 카테고리별로 모아 보고, 반응으로 지금 상황을 알려 줄 수 있어요.', shape: 'round', pad: 2, find: (phone) => phone.querySelectorAll('.bottom-nav button')[1] ?? null },
  { id: 'bell', title: '새 소식은 여기로', body: '내 글에 댓글이나 반응이 달리면 여기로 알려 드려요.', shape: 'circle', pad: 2, find: (phone) => phone.querySelector('.map-top-overlay .notice-bell') },
]

const GAP = 14
const SIDE = 16
const DemoIcon = categoryIcon['동네 소식']

export function GuideTour({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const steps = STEPS
  const [index, setIndex] = useState(0)
  // 화면(폰 틀) 크기와 짚을 곳. 짚을 곳을 끝내 못 찾으면 null (말풍선만 가운데)
  const [view, setView] = useState<{ w: number; h: number; hole: Rect | null; example?: boolean } | null>(null)
  // 주변에 핀이 없을 때 띄우는 예시 핀 자리
  const [demo, setDemo] = useState<{ x: number; y: number } | null>(null)
  const step = steps[index]
  const last = index === steps.length - 1

  useLayoutEffect(() => {
    const phone = ref.current?.closest<HTMLElement>('.phone')
    if (!phone) return
    let frameId = 0
    let stopped = false
    const started = performance.now()
    const measure = () => {
      if (stopped) return
      const frame = phone.getBoundingClientRect()
      const target = step.find(phone)
      if (!target) {
        if (step.id === 'pin' && !demo) { setDemo(demoSpot(phone)); return }
        if (performance.now() - started > 15000) { setView({ w: frame.width, h: frame.height, hole: null }); return }
        frameId = requestAnimationFrame(measure)
        return
      }
      const box = target.getBoundingClientRect()
      setView({ w: frame.width, h: frame.height, hole: holeFor(step, { x: box.left - frame.left, y: box.top - frame.top, w: box.width, h: box.height }, frame.width), example: target.classList.contains('tour-demo-pin') })
    }
    measure()
    // 지도가 아직 움직이는 중일 수 있어 조금 뒤 한 번 더 잰다
    const again = window.setTimeout(measure, 450)
    window.addEventListener('resize', measure)
    return () => { stopped = true; cancelAnimationFrame(frameId); window.clearTimeout(again); window.removeEventListener('resize', measure) }
  }, [index, demo])

  useEffect(() => { if (view) nextRef.current?.focus({ preventScroll: true }) }, [index, Boolean(view)])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const next = () => { if (last) onDone(); else setIndex(index + 1) }

  // 말풍선: 짚은 곳 위아래 중 넓은 쪽에, 가로는 짚은 곳 가운데에 맞추되 화면 안으로
  const width = view ? Math.min(view.w - SIDE * 2, 320) : 0
  const hole = view?.hole
  const below = hole && view ? view.h - (hole.y + hole.h) > hole.y : true
  const left = hole && view ? clamp(hole.x + hole.w / 2 - width / 2, SIDE, view.w - SIDE - width) : SIDE
  const arrow = hole ? clamp(hole.x + hole.w / 2 - left, 24, width - 24) : 0
  const bubbleStyle: React.CSSProperties = !view ? {} : !hole
    ? { left: (view.w - width) / 2, top: '50%', width, transform: 'translateY(-50%)' }
    : below ? { left, top: hole.y + hole.h + GAP, width } : { left, bottom: view.h - hole.y + GAP, width }

  return <div ref={ref} className={`guide-tour ${view ? 'ready' : ''} ${hole ? '' : 'no-hole'}`} role="dialog" aria-modal="true" aria-label="WGO 둘러보기" onClick={next}>
    {step.id === 'pin' && demo && <span className="map-marker tour-demo-pin" data-category="동네 소식" style={{ left: demo.x, top: demo.y }} aria-hidden="true">
      <span className="marker-dot"><DemoIcon size={15} strokeWidth={2.2}/></span>
    </span>}
    <div className={`tour-hole ${step.shape}`} style={hole ? { left: hole.x, top: hole.y, width: hole.w, height: hole.h } : undefined}/>
    {view && <section key={index} className={`tour-bubble ${hole ? (below ? 'below' : 'above') : ''}`} style={bubbleStyle} onClick={(event) => event.stopPropagation()} aria-live="polite">
      {hole && <i className="tour-arrow" style={{ left: arrow }} aria-hidden="true"/>}
      <header>
        <img src={mascotHead} alt="" width={30} height={30}/>
        <h2>{step.title}{view.example && <em className="tour-tag">예시 핀</em>}</h2>
        <small>{index + 1}/{steps.length}</small>
      </header>
      <p>{step.body}</p>
      <footer>
        {!last && <button type="button" className="tour-skip" onClick={onDone}>건너뛰기</button>}
        <button ref={nextRef} type="button" className="tour-next" onClick={next}>{last ? '시작하기' : '다음'}</button>
      </footer>
    </section>}
  </div>
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

// 짚을 곳: 원이면 긴 변을 지름으로 한 원, 아니면 둥근 네모. 너무 크면(반경 원) 화면 폭 안으로 줄인다
function holeFor(step: Step, box: Rect, frameWidth: number): Rect {
  if (step.shape === 'round') return { x: box.x - step.pad, y: box.y - step.pad, w: box.w + step.pad * 2, h: box.h + step.pad * 2 }
  const size = Math.min(Math.max(box.w, box.h) + step.pad * 2, frameWidth - 24)
  return { x: box.x + box.w / 2 - size / 2, y: box.y + box.h / 2 - size / 2, w: size, h: size }
}

// 예시 핀 자리: 내 위치 오른쪽 위 (위 필터 · 아래 말풍선 자리를 피해서)
function demoSpot(phone: HTMLElement) {
  const frame = phone.getBoundingClientRect()
  const me = phone.querySelector('.map-me')?.getBoundingClientRect()
  const top = (phone.querySelector('.map-top-overlay')?.getBoundingClientRect().bottom ?? frame.top) - frame.top
  const x = me ? me.left - frame.left + me.width / 2 + 70 : frame.width / 2 + 70
  const y = me ? me.top - frame.top + me.height / 2 - 90 : frame.height / 2 - 90
  return { x: clamp(x, 48, frame.width - 48), y: clamp(y, top + 48, frame.height - 320) }
}
