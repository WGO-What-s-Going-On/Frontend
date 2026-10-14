import { ArrowLeft } from 'lucide-react'
import { IconButton } from './IconButton'
import { useApp } from '../../context/AppContext'

// 뒤로 가기 버튼은 모두 짧은 겹쳐 전환으로 이전 화면에 돌아간다
export function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  const { withBackTransition } = useApp()
  return <header className="back-header"><IconButton className="icon" label="뒤로 가기" onClick={() => withBackTransition(onBack)}><ArrowLeft size={20}/></IconButton><h2>{title}</h2><div className="header-action">{action}</div></header>
}
