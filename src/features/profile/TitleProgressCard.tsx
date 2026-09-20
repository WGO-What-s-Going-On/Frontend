import { Medal } from 'lucide-react'

const titleLevels = [
  { name: '애기 소식통', minimum: 0 },
  { name: '꼬마 소식통', minimum: 5 },
  { name: '리포터', minimum: 15 },
  { name: '특파원', minimum: 30 },
  { name: '천리안', minimum: 50 },
]

export function TitleProgressCard({ postCount, commentCount }: { postCount: number; commentCount: number }) {
  const activityCount = postCount + commentCount
  const currentIndex = titleLevels.reduce((found, level, index) => activityCount >= level.minimum ? index : found, 0)
  const current = titleLevels[currentIndex]
  const next = titleLevels[currentIndex + 1]
  const progress = next ? Math.min(100, ((activityCount - current.minimum) / (next.minimum - current.minimum)) * 100) : 100
  const remaining = next ? next.minimum - activityCount : 0

  return <section className="title-progress-card" aria-label="활동 칭호">
    <div className="title-progress-head"><span className="title-medal"><Medal size={21}/></span><div><small>나의 칭호</small><h3>{current.name}</h3></div><strong>{activityCount}회</strong></div>
    <div className="title-progress-copy"><span>{next ? `다음 칭호 · ${next.name}` : '최고 칭호 달성'}</span><b>{next ? `${remaining}회 남음` : '완료'}</b></div>
    <div className="title-progress-track" role="progressbar" aria-label={next ? `${next.name} 달성 진행률` : '최고 칭호 달성'} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }}/></div>
    <p>게시글 {postCount}개 · 댓글 {commentCount}개 <span>작성할 때마다 1회 반영</span></p>
    <div className="title-levels" aria-label="칭호 단계">{titleLevels.map((level, index) => <span key={level.name} className={index === currentIndex ? 'current' : index < currentIndex ? 'complete' : ''}>{level.name}</span>)}</div>
  </section>
}
