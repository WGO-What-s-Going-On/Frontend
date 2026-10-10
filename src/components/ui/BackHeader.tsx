import { ArrowLeft } from 'lucide-react'
import { IconButton } from './IconButton'

export function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return <header className="back-header"><IconButton className="icon" label="뒤로 가기" onClick={onBack}><ArrowLeft size={20}/></IconButton><h2>{title}</h2><div className="header-action">{action}</div></header>
}
