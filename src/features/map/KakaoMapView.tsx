import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, Flame, Hand, LocateFixed, Megaphone, Minus, Plus } from 'lucide-react'
import { currentCoords, fromWorldPoint, toWorldPoint, type Coords } from '../../api/geo'
import type { Board, Category } from '../../types/domain'
import { RADIUS, boardPosition, type Point } from './mapWorld'

// 카카오 지도 (VITE_KAKAO_JS_KEY가 있을 때). 그림 지도(MapView)와 props · 핀 모양 · 버튼 위치가 같다.
// - 서버 글은 실제 위경도(board.location), 목업 글은 그림 지도 좌표를 내 위치 기준 위경도로 바꿔 찍는다
// - 핀 · 내 위치 점은 지도 위 오버레이에 React로 그려서 그림 지도와 같은 CSS를 쓴다

// 카카오 지도 SDK는 타입을 제공하지 않아 쓰는 부분만 적는다
interface LatLng { getLat(): number; getLng(): number }
interface KakaoMap {
  setCenter(position: LatLng): void
  panTo(position: LatLng): void
  panBy(dx: number, dy: number): void
  getCenter(): LatLng
  getLevel(): number
  setLevel(level: number, options?: { animate?: boolean }): void
  relayout(): void
}
interface Overlay { setMap(map: KakaoMap | null): void; setPosition(position: LatLng): void; setZIndex(zIndex: number): void }
interface KakaoMaps {
  load(callback: () => void): void
  LatLng: new (lat: number, lng: number) => LatLng
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => KakaoMap
  CustomOverlay: new (options: { position: LatLng; content: HTMLElement; xAnchor?: number; yAnchor?: number; zIndex?: number; clickable?: boolean }) => Overlay
  Circle: new (options: { center: LatLng; radius: number; strokeWeight: number; strokeColor: string; strokeOpacity: number; fillColor: string; fillOpacity: number }) => Overlay
  event: { addListener(target: KakaoMap, type: string, handler: () => void): void }
}
declare global { interface Window { kakao?: { maps: KakaoMaps } } }

// SDK는 한 번만 불러온다. 실패하면(키 · 도메인 등록 문제) 그림 지도로 돌아간다
let sdk: Promise<KakaoMaps> | null = null
export function loadKakaoMaps(appKey: string) {
  sdk ??= new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`
    script.onload = () => window.kakao ? window.kakao.maps.load(() => resolve(window.kakao!.maps)) : reject(new Error('kakao maps unavailable'))
    script.onerror = () => reject(new Error('kakao maps script failed'))
    document.head.appendChild(script)
  }).catch((error) => { sdk = null; throw error })
  return sdk
}

const markerIcon: Record<Category, typeof Flame> = {
  '긴급 사고': Flame,
  '도움 요청': Hand,
  '동네 소식': Megaphone,
  '일상 불편': CircleHelp,
}
// 150m 반경이 화면에 넉넉히 들어오는 확대 단계
const START_LEVEL = 3

const boardCoords = (board: Board, me: Coords) => board.location ?? fromWorldPoint(me, boardPosition(board))

export function KakaoMapView({ appKey, boards, selectedId, hotIds, onSelect, onMoved, onFail, focusOffsetY = 0, hideControls = false }: {
  appKey: string
  boards: Board[]
  selectedId?: string
  hotIds: Set<string>
  onSelect: (board?: Board) => void
  onMoved?: (center: Point) => void
  // SDK를 못 불러오면 그림 지도로 바꾼다
  onFail: () => void
  focusOffsetY?: number
  hideControls?: boolean
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<{ maps: KakaoMaps; map: KakaoMap } | null>(null)
  const [me, setMe] = useState<Coords | null>(null)
  const meRef = useRef<Coords | null>(null)
  meRef.current = me
  // 지도 이벤트 콜백은 한 번 등록되므로 최신 props는 ref로 읽는다
  const latest = useRef({ onSelect, onMoved })
  latest.current = { onSelect, onMoved }
  // 핀 · 내 위치를 그릴 오버레이 칸 (React가 portal로 채운다)
  const [slots, setSlots] = useState<Map<string, HTMLElement>>(new Map())
  const overlays = useRef(new Map<string, { overlay: Overlay; slot: HTMLElement }>())
  const circle = useRef<Overlay | null>(null)
  const resize = useRef<ResizeObserver | null>(null)

  useEffect(() => { currentCoords().then(setMe).catch(onFail) }, [])

  // 지도 만들기 + 반경 원 + 지도 빈 곳 탭 / 끌기 끝. 처음 위치를 받았을 때 한 번만 (이후 위치 변화는 오버레이 · 원만 옮긴다)
  const located = me !== null
  useEffect(() => {
    if (!me || !frameRef.current) return
    let cancelled = false
    loadKakaoMaps(appKey).then((maps) => {
      if (cancelled || !frameRef.current) return
      const center = new maps.LatLng(me.latitude, me.longitude)
      const created = new maps.Map(frameRef.current, { center, level: START_LEVEL })
      circle.current = new maps.Circle({ center, radius: RADIUS, strokeWeight: 2, strokeColor: '#2b5ce6', strokeOpacity: .45, fillColor: '#2b5ce6', fillOpacity: .07 })
      circle.current.setMap(created)
      // 지도 아래 끝을 하단 탭 위로 맞춘다: 카카오 로고(이용 약관상 가리면 안 됨)가 탭에 덮이지 않게.
      // 탭 높이는 기기 아래 여백(safe area)에 따라 달라서 실제 높이를 잰다. 크기가 바뀌면 지도도 다시 맞춘다
      const fit = () => {
        const frame = frameRef.current
        const nav = frame?.closest('.map-shell')?.querySelector<HTMLElement>('.bottom-nav')
        if (frame) frame.style.bottom = `${nav?.offsetHeight ?? 0}px`
        created.relayout()
      }
      fit()
      resize.current = new ResizeObserver(fit)
      resize.current.observe(frameRef.current.parentElement ?? frameRef.current)
      maps.event.addListener(created, 'click', () => latest.current.onSelect(undefined))
      maps.event.addListener(created, 'dragend', () => {
        const position = created.getCenter()
        if (meRef.current) latest.current.onMoved?.(toWorldPoint(meRef.current, { latitude: position.getLat(), longitude: position.getLng() }))
      })
      setMap({ maps, map: created })
    }).catch(() => { if (!cancelled) onFail() })
    return () => { cancelled = true }
  }, [located])

  // 오버레이: 내 위치 + 게시판마다 하나. 없어진 게시판은 지도에서 뗀다
  useEffect(() => {
    if (!map || !me) return
    const next = new Map<string, HTMLElement>()
    const place = (key: string, coords: Coords, zIndex: number) => {
      const position = new map.maps.LatLng(coords.latitude, coords.longitude)
      let entry = overlays.current.get(key)
      if (!entry) {
        const slot = document.createElement('div')
        slot.className = 'kakao-overlay-slot'
        const overlay = new map.maps.CustomOverlay({ position, content: slot, xAnchor: 0, yAnchor: 0, zIndex, clickable: true })
        overlay.setMap(map.map)
        entry = { overlay, slot }
        overlays.current.set(key, entry)
      } else entry.overlay.setPosition(position)
      next.set(key, entry.slot)
    }
    place('me', me, 2)
    circle.current?.setPosition(new map.maps.LatLng(me.latitude, me.longitude))
    boards.forEach((board) => place(board.id, boardCoords(board, me), board.id === selectedId ? 4 : 3))
    overlays.current.forEach((entry, key) => { if (!next.has(key)) { entry.overlay.setMap(null); overlays.current.delete(key) } })
    setSlots(next)
  }, [map, me, boards])

  // 고른 핀을 아래 시트 위쪽에 보이게 옮긴다
  useEffect(() => {
    if (!map || !me) return
    overlays.current.forEach((entry, key) => { if (key !== 'me') entry.overlay.setZIndex(key === selectedId ? 4 : 3) })
    const board = boards.find((item) => item.id === selectedId)
    if (!board) return
    const coords = boardCoords(board, me)
    map.map.setCenter(new map.maps.LatLng(coords.latitude, coords.longitude))
    if (focusOffsetY) map.map.panBy(0, focusOffsetY / 2)
  }, [map, selectedId])

  useEffect(() => () => { resize.current?.disconnect(); overlays.current.forEach((entry) => entry.overlay.setMap(null)); overlays.current.clear() }, [])

  const zoomBy = (step: number) => { if (map) map.map.setLevel(Math.min(10, Math.max(1, map.map.getLevel() + step)), { animate: true }) }
  const locate = () => {
    currentCoords().then((next) => {
      setMe(next)
      map?.map.panTo(new map.maps.LatLng(next.latitude, next.longitude))
      // 내 위치로 돌아오면 '이 지역에서 다시 찾기'를 닫는다
      latest.current.onMoved?.(toWorldPoint(next, next))
    }).catch(() => undefined)
  }

  return <div className="map-canvas kakao-map-canvas">
    <div ref={frameRef} className="kakao-map-frame"/>
    {slots.get('me') && createPortal(<span className="map-me" aria-label="내 위치"/>, slots.get('me')!)}
    {boards.map((board) => {
      const slot = slots.get(board.id)
      if (!slot) return null
      const Icon = markerIcon[board.category]
      const selected = board.id === selectedId
      return createPortal(<button className={`map-marker ${selected ? 'selected' : ''} ${hotIds.has(board.id) ? 'hot' : ''} ${board.distance > RADIUS ? 'far' : ''}`} data-category={board.category} onClick={(event) => { event.stopPropagation(); onSelect(board) }} aria-label={`${board.title}, ${board.distance}m`}>
        <span className="marker-dot"><Icon size={15} strokeWidth={2.2}/></span>
        {selected && <span className="marker-label">{board.title}</span>}
      </button>, slot, board.id)
    })}
    {!hideControls && <div className="map-controls">
      <div className="map-zoom"><button onClick={() => zoomBy(-1)} aria-label="지도 확대"><Plus size={18}/></button><button onClick={() => zoomBy(1)} aria-label="지도 축소"><Minus size={18}/></button></div>
      <button className="map-locate" onClick={locate} aria-label="내 위치로 이동"><LocateFixed size={19}/></button>
    </div>}
  </div>
}
