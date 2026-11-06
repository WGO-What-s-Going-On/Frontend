import { RotateCw } from 'lucide-react'

// 당겨서 새로고침 표시: 화면 맨 위에 당긴 만큼 열리고, 놓으면 돌면서 불러온다 (usePullToRefresh와 함께)
export function PullRefresh({ pull, refreshing, ready, labels = { idle: '당겨서 새로고침', ready: '놓으면 새로고침', busy: '불러오는 중' } }: {
  pull: number
  refreshing: boolean
  ready: boolean
  labels?: { idle: string; ready: string; busy: string }
}) {
  return <div className={`pull-refresh ${pull ? '' : 'idle'} ${refreshing ? 'refreshing' : ''}`} style={{ height: pull }} aria-live="polite">
    <RotateCw size={18} style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}/>
    <span>{refreshing ? labels.busy : ready ? labels.ready : labels.idle}</span>
  </div>
}
