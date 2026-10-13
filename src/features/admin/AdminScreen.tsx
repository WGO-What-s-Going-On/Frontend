import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useApp } from '../../context/AppContext'

// 운영자 신고 처리 (MOD-F08~F10). 일반 사용자 메뉴에는 없고 /admin 주소로만 들어온다.
export function AdminScreen() {
  const { reports, boards, comments, resolveReport, go } = useApp()
  const targetText = (targetType: '게시글' | '댓글', targetId: string) => targetType === '게시글' ? boards.find((board) => board.id === targetId)?.title : comments.find((comment) => comment.id === targetId)?.body
  const pending = reports.filter((report) => report.status === '접수')
  const done = reports.filter((report) => report.status !== '접수')
  return <AppShell nav={false} contentClassName="admin-screen">
    <BackHeader title="신고 관리" onBack={() => go('my')}/>
    <h4>처리 대기 {pending.length}</h4>
    {pending.length ? <ul className="admin-list">{pending.map((report) => <li key={report.id} className="admin-report">
      <div><span className="admin-type">{report.targetType}</span><span className="admin-reason">{report.reason}</span></div>
      <p>{targetText(report.targetType, report.targetId) ?? '삭제된 콘텐츠'}</p>
      <div className="admin-actions"><Button className="admin-reject" onClick={() => resolveReport(report.id, false)}>기각</Button><Button className="admin-hide" onClick={() => resolveReport(report.id, true)}>숨김 처리</Button></div>
    </li>)}</ul> : <EmptyState title="처리할 신고가 없어요."/>}
    {done.length > 0 && <><h4>처리 완료 {done.length}</h4><ul className="admin-list done">{done.map((report) => <li key={report.id} className="admin-report"><div><span className="admin-type">{report.targetType}</span><span className="admin-reason">{report.reason}</span></div><p>{targetText(report.targetType, report.targetId) ?? '숨김 처리됨'}</p></li>)}</ul></>}
  </AppShell>
}
