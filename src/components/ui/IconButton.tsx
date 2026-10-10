import type { ReactNode } from 'react'

// 아이콘만 있는 버튼. 글자가 없으므로 label(aria-label)을 반드시 받는다.
export function IconButton({ className, label, onClick, disabled, expanded, children }: {
  className: string
  label: string
  onClick: () => void
  disabled?: boolean
  expanded?: boolean
  children: ReactNode
}) {
  return <button className={className} onClick={onClick} disabled={disabled} aria-label={label} aria-expanded={expanded}>{children}</button>
}
