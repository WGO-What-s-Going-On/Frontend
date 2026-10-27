import { ChevronRight } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { levelIndex, levelProgress, levels } from '../level/levels'
import type { LevelStats } from '../level/levels'

// 마이 위 프로필 카드: 지금 칭호와 다음 칭호까지 남은 양 (단계 전체는 하단 '활동' 탭에서)
export function TitleProgressCard({ stats, name, onOpen }: { stats: LevelStats; name: string; onOpen?: () => void }) {
  const current = levels[levelIndex(stats)]
  const progress = levelProgress(stats)

  return <button className="title-progress-card" onClick={onOpen} aria-label={`프로필 수정, 현재 칭호 ${current.name}`}>
    <div className="title-progress-identity"><Avatar name={name}/><div><small>{name} · 현재 칭호</small><h3>{current.name}</h3><p>{progress ? `${progress.next.name}까지 ${progress.remaining}${progress.unit} 남았어요` : '최고 칭호를 달성했어요'}</p></div></div>
    <ChevronRight className="title-progress-arrow" size={20}/>
  </button>
}
