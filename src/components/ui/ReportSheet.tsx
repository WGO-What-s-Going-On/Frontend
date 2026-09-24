import { useState } from 'react'
import { X } from 'lucide-react'
import type { Report } from '../../types/domain'

const REASONS = ['부정확한 정보', '광고·홍보', '욕설·비방', '개인정보 노출', '기타']

/**
 * 게시글 신고는 탭 한 번에 바로 접수됐고 댓글 신고만 사유를 물었다.
 * 되돌리기 어려운 행동이므로 두 경로를 같은 시트로 합치고, 사유 선택 + 확인 두 단계를 거치게 한다.
 */
export function ReportSheet({ targetType, targetLabel, onSubmit, onClose }: {
  targetType: Report['targetType']
  targetLabel: string
  onSubmit: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  return <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={`${targetType} 신고`}>
    <button className="sheet-backdrop" onClick={onClose} aria-label="신고 닫기"/>
    <section className="action-sheet">
      <div className="sheet-grabber"/>
      <header><div><h2>{targetType} 신고</h2><p>{targetLabel}</p></div><button onClick={onClose} aria-label="닫기"><X size={20}/></button></header>
      <div className="report-reasons">{REASONS.map((item) => <button key={item} className={reason === item ? 'selected' : ''} onClick={() => setReason(item)} aria-pressed={reason === item}>{item}</button>)}</div>
      <p className="sheet-caution">신고는 취소할 수 없어요. 운영자가 확인 후 처리합니다.</p>
      <button className="sheet-confirm" disabled={!reason} onClick={() => onSubmit(reason)}>{reason ? `'${reason}'(으)로 신고하기` : '사유를 선택하세요'}</button>
    </section>
  </div>
}
