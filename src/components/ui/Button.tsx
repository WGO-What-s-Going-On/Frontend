import type { ReactNode } from 'react'

// 글자가 있는 버튼. 모양은 className으로 정한다 (primary, kakao, quick-submit, secondary-button 등).
// pending: 서버 응답을 기다리는 동안 누르지 못하게 하고 글자는 그대로 둔다.
export function Button({ className, onClick, disabled, pending = false, children }: {
  className?: string
  onClick: () => void
  disabled?: boolean
  pending?: boolean
  children: ReactNode
}) {
  return <button className={className} onClick={onClick} disabled={disabled || pending || undefined} aria-busy={pending || undefined}>{children}</button>
}
