import { Button } from './Button'

// 데이터가 없거나 이용할 수 없을 때. action이 있으면 다음 행동 버튼을 함께 보여준다.
export function EmptyState({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><strong>{title}</strong>{action && onAction && <Button className="secondary-button" onClick={onAction}>{action}</Button>}</div>
}
