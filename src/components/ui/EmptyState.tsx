/** 빈 화면은 설명만 남기지 않고 항상 다음 행동 하나를 제시한다. */
export function EmptyState({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state">
    <strong>{title}</strong>
    {description && <p>{description}</p>}
    {action && onAction && <button className="secondary-button" onClick={onAction}>{action}</button>}
  </div>
}
