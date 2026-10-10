// 서버가 주는 원래 값(시각, 미터, 개수)을 화면 문구로 바꾸는 함수.
// 지금 목업 데이터는 이미 문구('2분 전', 24)라서 백엔드 연동 때부터 쓴다.

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatRelativeTime(iso: string, now: Date = new Date()) {
  const diff = now.getTime() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < MINUTE) return '방금 전'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`
  if (diff < 2 * DAY) return '어제'
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(iso))
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1).replace(/\.0$/, '')}km`
}

export function formatCount(count: number) {
  if (count < 1000) return String(count)
  if (count < 10000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}천`
  return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}만`
}
