// 서버 시각(ISO) → 화면 표시 ('방금 전', 'N분 전', 'N시간 전', '어제', 'N일 전'). 목업 데이터와 같은 모양이라 투표 시간 계산(minutesSince)도 그대로 쓴다
export function timeAgo(iso: string, now = Date.now()) {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  const minutes = Math.floor((now - time) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return days === 1 ? '어제' : `${days}일 전`
}
