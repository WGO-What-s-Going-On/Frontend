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
  const progress = next ? Math.min(100, Math.max(0, ((activityCount - current.minimum) / (next.minimum - current.minimum)) * 100)) : 100
  const remaining = next ? next.minimum - activityCount : 0

  return <section className="title-progress-card" aria-label="활동 칭호">
    <div className="title-progress-head"><div><small>현재 칭호</small><h3>{current.name}</h3></div><strong>{activityCount}{next && <span>/{next.minimum}</span>}</strong></div>
    <div className="title-progress-copy"><b>{next ? `${next.name}까지 ${remaining}회 남았어요` : '최고 칭호를 달성했어요'}</b></div>
    <div className="title-progress-track" role="progressbar" aria-label={next ? `${next.name} 달성 진행률` : '최고 칭호 달성'} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }}/></div>
    <p>게시글 또는 댓글 작성 시 활동 1회</p>
  </section>
}
