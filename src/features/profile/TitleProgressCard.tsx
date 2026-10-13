import { Avatar } from '../../components/ui/Avatar'

const titleLevels = [
  { name: '애기 소식통', minimum: 0 },
  { name: '꼬마 소식통', minimum: 5 },
  { name: '리포터', minimum: 15 },
  { name: '특파원', minimum: 30 },
  { name: '천리안', minimum: 50 },
]

export function TitleProgressCard({ postCount, commentCount, name, profileImage }: { postCount: number; commentCount: number; name: string; profileImage?: string }) {
  const activityCount = postCount + commentCount
  const currentIndex = titleLevels.reduce((found, level, index) => activityCount >= level.minimum ? index : found, 0)
  const current = titleLevels[currentIndex]
  const next = titleLevels[currentIndex + 1]
  const remaining = next ? next.minimum - activityCount : 0

  return <section className="title-progress-card" aria-label="활동 칭호">
    <div className="title-progress-identity"><Avatar src={profileImage} name={name}/><div><small>{name} · 현재 칭호</small><h3>{current.name}</h3><p>{next ? `${next.name}까지 ${remaining}회 남았어요` : '최고 칭호를 달성했어요'}</p></div></div>
  </section>
}
