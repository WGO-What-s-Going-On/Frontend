import { useRef } from 'react'
import { Button } from './Button'
import { useStatusTint } from './statusTint'

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose, danger = false }: { title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }) {
  const backdrop = useRef<HTMLDivElement>(null)
  useStatusTint(backdrop)
  return <div ref={backdrop} className="dialog-backdrop" role="presentation" onClick={onClose}><section className="dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>{title}</h2><p>{description}</p><div className="dialog-actions"><Button onClick={onClose}>취소</Button><Button className={danger ? 'danger-button' : 'primary-button'} onClick={onConfirm}>{confirmLabel}</Button></div></section></div>
}
