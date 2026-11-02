import { ME, type Point } from '../features/map/mapWorld'

export interface Coords { latitude: number; longitude: number }

// 개발용 고정 위치 (.env.local의 VITE_DEV_LATLNG="37.5048,126.9573"). 브라우저 위치를 못 받을 때만 쓴다
const devCoords = (() => {
  const [latitude, longitude] = (import.meta.env.VITE_DEV_LATLNG ?? '').split(',').map(Number)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null
})()

// 지금 위치 (휴대폰 GPS · 브라우저 위치 권한). 실패하면 개발용 위치, 그것도 없으면 오류
export function currentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { if (devCoords) resolve(devCoords); else reject(new Error('위치를 사용할 수 없어요')); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => { if (devCoords) resolve(devCoords); else reject(error) },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  })
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
