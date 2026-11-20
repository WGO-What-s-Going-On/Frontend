import { ME, type Point } from '../features/map/mapWorld'

export interface Coords { latitude: number; longitude: number }

// 개발용 고정 위치 (.env.local의 VITE_DEV_LATLNG="37.5048,126.9573"). 브라우저 위치를 못 받을 때만 쓴다
const devCoords = (() => {
  const [latitude, longitude] = (import.meta.env.VITE_DEV_LATLNG ?? '').split(',').map(Number)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
})()

// 지금 위치 (휴대폰 GPS · 브라우저 위치 권한). 실패하면 개발용 위치, 그것도 없으면 오류
// accuracy: 오차 반경(m). 브라우저가 잠깐 부정확한 위치(와이파이 · 기지국 추정)를 줄 때 걸러내는 데 쓴다
// 위치 요청을 줄인다: iOS(특히 홈 화면 앱)는 위치를 물을 때마다 허용 창을 다시 띄우기도 해서,
// 동시에 들어온 요청(지도 · 서버 동기화가 화면을 열 때 함께 부른다)은 한 번만 묻고, 3초 안의 위치는 다시 쓴다.
// (글쓰기 · 이동 중 안내는 5~7초마다 새 위치가 필요해서 더 길게 두지 않는다)
type Fix = Coords & { accuracy?: number }
let pending: Promise<Fix> | null = null
let recent: { fix: Fix; at: number } | null = null
const REUSE_MS = 3_000

export function currentCoords(): Promise<Fix> {
  if (recent && Date.now() - recent.at < REUSE_MS) return Promise.resolve(recent.fix)
  pending ??= new Promise<Fix>((resolve, reject) => {
    if (!('geolocation' in navigator)) { if (devCoords) resolve(devCoords); else reject(new Error('위치를 사용할 수 없어요')); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const fix = { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }
        recent = { fix, at: Date.now() }
        resolve(fix)
      },
      (error) => { if (devCoords) resolve(devCoords); else reject(error) },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  }).finally(() => { pending = null })
  return pending
}

// 두 위경도 사이 거리 (m)
export function distanceMeters(a: Coords, b: Coords) {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLon = (b.longitude - a.longitude) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(h))
}

// 목업 지도 좌표 → 위경도 (toWorldPoint의 반대). 실제 지도에 목업 글을 내 위치 주변으로 찍을 때 쓴다
export function fromWorldPoint(me: Coords, point: Point): Coords {
  const metersPerLat = 110540
  const metersPerLon = 111320 * Math.cos(me.latitude * Math.PI / 180)
  return { latitude: me.latitude - (point.y - ME.y) / metersPerLat, longitude: me.longitude + (point.x - ME.x) / metersPerLon }
}

// 목업 지도(1 = 1m)에 실제 위경도 올리기: 내 위치를 지도 가운데(ME)에 두고 위경도 차이를 m로 바꾼다
export function toWorldPoint(me: Coords, target: Coords): Point {
  const metersPerLat = 110540
  const metersPerLon = 111320 * Math.cos(me.latitude * Math.PI / 180)
  return { x: ME.x + (target.longitude - me.longitude) * metersPerLon, y: ME.y - (target.latitude - me.latitude) * metersPerLat }
}
