import './states.css'

// 불러오기 실패. 다시 시도할 수 있게 한다.
export function ErrorState({ title = '불러오지 못했어요', description = '잠시 후 다시 시도해 주세요.', onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <div className="error-state" role="alert"><strong>{title}</strong><p>{description}</p>{onRetry && <button className="secondary-button" onClick={onRetry}>다시 시도</button>}</div>
}
