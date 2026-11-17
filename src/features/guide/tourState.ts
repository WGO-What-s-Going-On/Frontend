// 지도 둘러보기(투어)를 띄울지: 가입을 막 마친 사람, 마이 > 이용 가이드에서 다시 보기를 누른 사람만.
// 기기에 '봤음'만 기록하면 기존 사용자도 새 기기에서 로그인할 때마다 떠서, 띄울 차례일 때만 기록해 둔다.
// a: 예시 핀 단계 포함 (5단계) · b: 핀 단계 없이 (4단계). 비교용, 하나로 정하면 정리한다
export type TourVariant = 'a' | 'b'
const KEY = 'wgo-guide-tour'

export function requestTour(variant: TourVariant = 'a') {
  try { localStorage.setItem(KEY, variant) } catch { /* 저장 못 하면 이번엔 건너뛴다 */ }
}

export function pendingTour(): TourVariant | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'a' || value === 'b' ? value : null
  } catch { return null }
}

export function clearTour() {
  try { localStorage.removeItem(KEY) } catch { /* 없음 */ }
}
