import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CircleHelp, Flame, Hand, LocateFixed, Megaphone, Minus, Plus } from 'lucide-react'
import type { Board, Category } from '../../types/domain'
import { ME, RADIUS, WORLD_SIZE, boardPosition, type Point } from './mapWorld'

// 손으로 움직이는 목업 지도.
// - 한 손가락(마우스) 끌기: 이동 / 두 손가락: 확대·축소 / 휠·트랙패드: 확대·축소 / 두 번 탭: 확대
// - 핀은 지도 배율과 상관없이 같은 크기로 그린다. 반경 150m 원은 실제 거리라서 지도와 함께 커진다.
// 실제 지도 SDK로 바꾸면 이 컴포넌트만 교체하면 된다 (props는 그대로).

interface View { x: number; y: number; scale: number }
const MIN_SCALE = 0.45
const MAX_SCALE = 3
const START_SCALE = 0.9

const markerIcon: Record<Category, typeof Flame> = {
  '긴급 사고': Flame,
  '도움 요청': Hand,
  '동네 소식': Megaphone,
  '일상 불편': CircleHelp,
}

function clampView(view: View, width: number, height: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale))
  const worldW = WORLD_SIZE * scale
  const worldH = WORLD_SIZE * scale
  const x = worldW <= width ? (width - worldW) / 2 : Math.min(0, Math.max(width - worldW, view.x))
  const y = worldH <= height ? (height - worldH) / 2 : Math.min(0, Math.max(height - worldH, view.y))
  return { x, y, scale }
}

// 화면 좌표 (sx, sy)에 보이는 지점을 그대로 둔 채 배율만 바꾼다
function zoomAt(view: View, nextScale: number, sx: number, sy: number): View {
  const worldX = (sx - view.x) / view.scale
  const worldY = (sy - view.y) / view.scale
  return { scale: nextScale, x: sx - worldX * nextScale, y: sy - worldY * nextScale }
}

export function MapView({ boards, selectedId, hotIds, onSelect, onMoved, focusOffsetY = 0, hideControls = false }: {
  boards: Board[]
  selectedId?: string
  hotIds: Set<string>
  onSelect: (board?: Board) => void
  // 지도를 크게 옮겼을 때 (이 지역 다시 찾기)
  onMoved?: (center: Point) => void
  // 아래쪽 시트가 가리는 만큼 선택한 핀을 위로 올려서 보여준다
  focusOffsetY?: number
  hideControls?: boolean
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 402, height: 780 })
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: START_SCALE })
  const viewRef = useRef(view)
  viewRef.current = view
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ view: View; points: { x: number; y: number }[]; moved: boolean; onMarker: boolean } | null>(null)
  // 끌기·핀치가 끝난 직후에는 핀 클릭으로 처리하지 않는다
  const dragged = useRef(false)
  const animation = useRef<number>(0)

  const centerOn = (point: Point, scale: number, width = size.width, height = size.height) =>
    clampView({ scale, x: width / 2 - point.x * scale, y: (height - focusOffsetY) / 2 - point.y * scale }, width, height)

  // 처음: 내 위치를 가운데에
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => {
      const next = { width: frame.clientWidth, height: frame.clientHeight }
      setSize(next)
      setView((current) => current.x === 0 && current.y === 0 ? centerOn(ME, START_SCALE, next.width, next.height) : clampView(current, next.width, next.height))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const animateTo = (target: View, duration = 320) => {
    cancelAnimationFrame(animation.current)
    const from = viewRef.current
    const start = performance.now()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setView({ x: from.x + (target.x - from.x) * ease, y: from.y + (target.y - from.y) * ease, scale: from.scale + (target.scale - from.scale) * ease })
      if (t < 1) animation.current = requestAnimationFrame(step)
    }
    animation.current = requestAnimationFrame(step)
  }

  // 핀을 고르면 그 핀이 시트 위쪽에 보이도록 지도를 옮긴다
  useEffect(() => {
    const board = boards.find((item) => item.id === selectedId)
    if (board) animateTo(centerOn(boardPosition(board), Math.max(viewRef.current.scale, 1)))
  }, [selectedId])

  // 휠·트랙패드 확대 (기본 스크롤을 막아야 해서 passive가 아닌 리스너로 단다)
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      cancelAnimationFrame(animation.current)
      const rect = frame.getBoundingClientRect()
      const current = viewRef.current
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * Math.exp(-event.deltaY * (event.ctrlKey ? .01 : .0018))))
      setView(clampView(zoomAt(current, nextScale, event.clientX - rect.left, event.clientY - rect.top), rect.width, rect.height))
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [])

  const local = (event: React.PointerEvent) => {
    const rect = frameRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const restartGesture = (onMarker = gesture.current?.onMarker ?? false) => {
    gesture.current = { view: viewRef.current, points: [...pointers.current.values()], moved: gesture.current?.moved ?? false, onMarker }
  }
  // 핀 위에서 시작해도 끌기·핀치가 되도록 한다. 확대·내 위치 버튼에서는 시작하지 않는다.
  const onPointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('.map-controls')) return
    cancelAnimationFrame(animation.current)
    pointers.current.set(event.pointerId, local(event))
    if (pointers.current.size === 1) { gesture.current = null; dragged.current = false }
    restartGesture(pointers.current.size === 1 ? Boolean((event.target as HTMLElement).closest('.map-marker')) : undefined)
  }
  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return
    pointers.current.set(event.pointerId, local(event))
    const start = gesture.current
    const now = [...pointers.current.values()]
    if (now.length === 1 && start.points.length === 1) {
      const dx = now[0].x - start.points[0].x
      const dy = now[0].y - start.points[0].y
      if (!start.moved && Math.abs(dx) + Math.abs(dy) <= 4) return
      start.moved = true
      dragged.current = true
      // 움직이기 시작한 뒤에만 포인터를 붙잡는다 (그냥 탭은 핀 클릭으로 남도록)
      frameRef.current?.setPointerCapture(event.pointerId)
      setView(clampView({ ...start.view, x: start.view.x + dx, y: start.view.y + dy }, size.width, size.height))
    } else if (now.length >= 2 && start.points.length >= 2) {
      start.moved = true
      dragged.current = true
      for (const id of pointers.current.keys()) if (!frameRef.current?.hasPointerCapture(id)) frameRef.current?.setPointerCapture(id)
      const [a0, b0] = start.points
      const [a1, b1] = now
      const ratio = Math.hypot(b1.x - a1.x, b1.y - a1.y) / Math.max(1, Math.hypot(b0.x - a0.x, b0.y - a0.y))
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }
      const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, start.view.scale * ratio))
      const zoomed = zoomAt(start.view, nextScale, mid0.x, mid0.y)
      setView(clampView({ ...zoomed, x: zoomed.x + mid1.x - mid0.x, y: zoomed.y + mid1.y - mid0.y }, size.width, size.height))
    }
  }
  const onPointerUp = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.delete(event.pointerId)
    const moved = gesture.current?.moved
    const onMarker = gesture.current?.onMarker
    if (pointers.current.size > 0) { restartGesture(); return }
    gesture.current = null
    if (!moved) { if (!onMarker) onSelect(undefined) }
    else {
      const current = viewRef.current
      onMoved?.({ x: (size.width / 2 - current.x) / current.scale, y: (size.height / 2 - current.y) / current.scale })
    }
  }
  const onDoubleClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button')) return
    const rect = frameRef.current!.getBoundingClientRect()
    const current = viewRef.current
    animateTo(clampView(zoomAt(current, Math.min(MAX_SCALE, current.scale * 1.7), event.clientX - rect.left, event.clientY - rect.top), rect.width, rect.height), 240)
  }
  const zoomBy = (factor: number) => {
    const current = viewRef.current
    animateTo(clampView(zoomAt(current, Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor)), size.width / 2, size.height / 2), size.width, size.height), 220)
  }

  const toScreen = (point: Point) => ({ x: view.x + point.x * view.scale, y: view.y + point.y * view.scale })
  const me = toScreen(ME)
  const markers = useMemo(() => boards.map((board) => ({ board, point: boardPosition(board) })), [boards])

  return <div ref={frameRef} className="map-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDoubleClick={onDoubleClick}>
    <div className="map-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} aria-hidden="true">
      <MapArt/>
      <span className="map-radius" style={{ left: ME.x - RADIUS, top: ME.y - RADIUS, width: RADIUS * 2, height: RADIUS * 2 }}/>
    </div>
    <span className="map-me" style={{ transform: `translate(${me.x}px, ${me.y}px)` }} aria-label="내 위치"/>
    {markers.map(({ board, point }) => {
      const screen = toScreen(point)
      if (screen.x < -60 || screen.y < -60 || screen.x > size.width + 60 || screen.y > size.height + 60) return null
      const Icon = markerIcon[board.category]
      const selected = board.id === selectedId
      return <button key={board.id} className={`map-marker ${selected ? 'selected' : ''} ${hotIds.has(board.id) ? 'hot' : ''} ${board.distance > RADIUS ? 'far' : ''}`} data-category={board.category} style={{ transform: `translate(${screen.x}px, ${screen.y}px)` }} onClick={() => { if (!dragged.current) onSelect(board) }} aria-label={`${board.title}, ${board.distance}m`}>
        <span className="marker-dot"><Icon size={15} strokeWidth={2.2}/></span>
        {selected && <span className="marker-label">{board.title}</span>}
      </button>
    })}
    {!hideControls && <div className="map-controls">
      <div className="map-zoom"><button onClick={() => zoomBy(1.5)} aria-label="지도 확대"><Plus size={18}/></button><button onClick={() => zoomBy(1 / 1.5)} aria-label="지도 축소"><Minus size={18}/></button></div>
      <button className="map-locate" onClick={() => animateTo(centerOn(ME, Math.max(START_SCALE, Math.min(view.scale, 1.4))))} aria-label="내 위치로 이동"><LocateFixed size={19}/></button>
    </div>}
  </div>
}

// 목업 지도 그림 (2000m × 2000m). 큰길·골목·공원·하천·동네 이름
const majorRoads = [
  { d: 'M0 1000 H2000', w: 34, name: '테헤란로', label: { x: 640, y: 988 } },
  { d: 'M1000 0 V2000', w: 34, name: '강남대로', label: { x: 1012, y: 640 }, vertical: true },
  { d: 'M1520 0 V2000', w: 24, name: '선릉로', label: { x: 1532, y: 1280 }, vertical: true },
  { d: 'M470 0 V2000', w: 24, name: '논현로', label: { x: 482, y: 1180 }, vertical: true },
  { d: 'M0 480 H2000', w: 24, name: '봉은사로', label: { x: 1180, y: 470 } },
  { d: 'M0 1540 H2000', w: 24, name: '도곡로', label: { x: 760, y: 1530 } },
  { d: 'M0 1840 L2000 1160', w: 20, name: '', label: undefined },
]
const minorLines = Array.from({ length: 15 }, (_, index) => 130 * (index + 1) + 20)

function MapArt() {
  return <svg className="map-art" width={WORLD_SIZE} height={WORLD_SIZE} viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}>
    <rect width={WORLD_SIZE} height={WORLD_SIZE} className="map-ground"/>
    <path d="M-50 1760 C 500 1700, 900 1900, 1400 1820 S 2000 1700, 2100 1760" className="map-river"/>
    <rect x="1150" y="1140" width="250" height="190" rx="28" className="map-green"/>
    <rect x="280" y="290" width="230" height="170" rx="28" className="map-green"/>
    <rect x="1640" y="560" width="220" height="260" rx="28" className="map-green"/>
    {minorLines.map((line) => <g key={line}><path d={`M0 ${line} H${WORLD_SIZE}`} className="map-road minor"/><path d={`M${line} 0 V${WORLD_SIZE}`} className="map-road minor"/></g>)}
    {majorRoads.map((road) => <path key={road.d} d={road.d} className="map-road major" style={{ strokeWidth: road.w }}/>)}
    {majorRoads.map((road) => road.label && <text key={road.name} x={road.label.x} y={road.label.y} className="map-road-name" transform={road.vertical ? `rotate(90 ${road.label.x} ${road.label.y})` : undefined}>{road.name}</text>)}
    <text x="1046" y="1060" className="map-place">강남역</text>
    <text x="1566" y="1060" className="map-place">선릉역</text>
    <text x="1260" y="780" className="map-area">역삼동</text>
    <text x="560" y="760" className="map-area">논현동</text>
    <text x="1180" y="1680" className="map-area">도곡동</text>
    <text x="1275" y="1242" className="map-park-name">새봄공원</text>
    <text x="395" y="382" className="map-park-name">은행나무공원</text>
    <text x="1750" y="696" className="map-park-name">선정릉</text>
  </svg>
}
