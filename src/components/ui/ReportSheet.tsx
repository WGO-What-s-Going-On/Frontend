import { useState } from 'react'
import type { Report } from '../../types/domain'

const REASONS = ['부정확한 정보', '광고·홍보', '욕설·비방', '개인정보 노출', '기타']

/**
 * 게시글 신고는 탭 한 번에 바로 접수됐고 댓글 신고만 사유를 물었다.
 * 되돌릴 수 없는 행동이므로 두 경로를 같은 시트로 합치고 사유를 고르게 한다.
 */
export function ReportSheet({ targetType, onSubmit, onClose }: {
  targetType: Report['targetType']
  onSubmit: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  return <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={`${targetType} 신고`}>
    <button className="sheet-backdrop" onClick={onClose} aria-label="닫기"/>
    <section className="action-sheet">
      <h2>{targetType} 신고</h2>
      <div className="report-reasons">{REASONS.map((item) => <button key={item} className={reason === item ? 'selected' : ''} onClick={() => setReason(item)} aria-pressed={reason === item}>{item}</button>)}</div>
      <button className="sheet-confirm" disabled={!reason} onClick={() => onSubmit(reason)}>신고하기</button>
    </section>
  </div>
}
