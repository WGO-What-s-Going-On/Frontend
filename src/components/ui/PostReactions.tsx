import { forwardRef } from 'react'
import { Check, Lightbulb, Radio } from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { reactionLabel } from '../../domain/labels'
import { myReactions } from '../../types/domain'
import type { Board, PostReaction } from '../../types/domain'

// 물음표만 (lucide에는 동그라미 테두리가 있는 물음표뿐이라 직접 그린다). 글자 폭이 좁아 옆 아이콘보다 가늘어 보여서 선을 1.2배로
const QuestionMark = forwardRef<SVGSVGElement, LucideProps>(({ size = 24, strokeWidth = 2, color = 'currentColor', ...rest }, ref) => <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={Number(strokeWidth) * 1.2} strokeLinecap="round" strokeLinejoin="round" {...rest}><path d="M7.2 7.6a4.9 4.9 0 0 1 9.6 1.5c0 3.2-4.8 4-4.8 6.6"/><path d="M12 20.6h.01"/></svg>) as unknown as LucideIcon
QuestionMark.displayName = 'QuestionMark'

export const reactionLabels: PostReaction[] = ['저도 궁금해요', '지금도 그래요', '도움 됐어요', '이제 끝났어요']
export const reactionOptions = [
  { label: '저도 궁금해요', icon: QuestionMark },
  { label: '지금도 그래요', icon: Radio },
  { label: '도움 됐어요', icon: Lightbulb },
  { label: '이제 끝났어요', icon: Check },
] satisfies { label: PostReaction; icon: LucideIcon }[]

// 상세 화면(fullLabels)은 반응마다 따로 누르는 버튼 4칸: 윗줄 아이콘 + 이름, 아랫줄 숫자(다른 사람들이 고른 수).
// 내가 고른 칸은 파란 칠 + 오른쪽 위 체크 표시
export function PostReactions({ board, interactive = false, fullLabels = false, onReact }: { board: Board; interactive?: boolean; fullLabels?: boolean; onReact?: (reaction: PostReaction) => void }) {
  if (fullLabels) return <div className={`post-reactions tiles ${interactive ? 'interactive' : ''}`}>{reactionOptions.map(({ label, icon: Icon }) => {
    const name = reactionLabel[label].full
    const mine = myReactions(board).includes(label)
    return interactive
      ? <button key={label} className={mine ? 'selected' : ''} aria-pressed={mine} aria-label={`${name} ${board.reactions[label]}`} onClick={() => onReact?.(label)}><Icon size={15}/><b>{name}</b><small>{board.reactions[label]}</small>{mine && <i className="reaction-check" aria-hidden="true"><Check size={10} strokeWidth={3.2}/></i>}</button>
      : <span key={label} className={mine ? 'selected' : ''} aria-label={`${name} ${board.reactions[label]}`}><Icon size={15}/><b>{name}</b><small>{board.reactions[label]}</small>{mine && <i className="reaction-check" aria-hidden="true"><Check size={10} strokeWidth={3.2}/></i>}</span>
  })}</div>
  return <div className={`post-reactions ${interactive ? 'interactive' : ''} ${fullLabels ? 'full-labels tiles' : ''}`}>{reactionOptions.map(({ label, icon: Icon }) => { const { full: fullLabel, short: shortLabel } = reactionLabel[label]; return interactive
    ? <button key={label} className={myReactions(board).includes(label) ? 'selected' : ''} aria-pressed={myReactions(board).includes(label)} onClick={() => onReact?.(label)} aria-label={`${fullLabel} ${board.reactions[label]}`} title={fullLabel}><Icon size={15}/><b>{fullLabels ? fullLabel : shortLabel}</b><span>{board.reactions[label]}</span></button>
    : <span key={label} title={fullLabel}><Icon size={15}/><b>{fullLabels ? fullLabel : shortLabel}</b><small>{board.reactions[label]}</small></span>
  })}</div>
}
