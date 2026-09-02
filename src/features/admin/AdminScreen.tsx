import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { useApp } from '../../context/AppContext'

export function AdminScreen() {
  const { reports, boards, resolveReport, go } = useApp()
  const activeBoards = boards.filter((board) => board.status === '실시간').length
  return <AppShell><BackHeader title="관리자 운영 화면" onBack={() => go('my')}/><div className="metrics"><span><strong>{activeBoards}</strong><small>활성 게시판</small></span><span><strong>{reports.filter((report) => report.status === '접수').length}</strong><small>미처리 신고</small></span><span><strong>{boards.filter((board) => board.status === '숨김').length}</strong><small>숨김 콘텐츠</small></span></div><h4>신고 검토</h4>{reports.length ? <div className="report-list">{reports.map((report) => <article className="report-card" key={report.id}><div className="row"><strong>{report.targetType} 신고</strong><small>{report.status}</small></div><p>{report.reason}</p>{report.status === '접수' && <div className="row-actions"><button onClick={() => resolveReport(report.id, false)}>문제없음</button><button className="danger-button" onClick={() => resolveReport(report.id, true)}>숨김 처리</button></div>}</article>)}</div> : <div className="empty-state"><strong>접수된 신고가 없습니다.</strong><p>게시글 또는 댓글 상세에서 신고하면 이곳에 표시됩니다.</p></div>}</AppShell>
}
