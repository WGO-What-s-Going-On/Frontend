import { ArrowLeft } from 'lucide-react'

export function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return <header className="back-header"><button className="icon" onClick={onBack} aria-label="뒤로 가기"><ArrowLeft size={20}/></button><h2>{title}</h2><div className="header-action">{action}</div></header>
}
