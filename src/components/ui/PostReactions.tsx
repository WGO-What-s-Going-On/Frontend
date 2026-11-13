import { Check, CircleCheck, CircleHelp, Lightbulb, Radio } from 'lucide-react'
import { reactionLabel } from '../../domain/labels'
import { myReactions } from '../../types/domain'
import type { Board, PostReaction } from '../../types/domain'

export const reactionLabels: PostReaction[] = ['저도 궁금해요', '지금도 그래요', '도움 됐어요', '이제 끝났어요']
export const reactionOptions = [
  { label: '저도 궁금해요', icon: CircleHelp },
  { label: '지금도 그래요', icon: Radio },
  { label: '도움 됐어요', icon: Lightbulb },
  { label: '이제 끝났어요', icon: CircleCheck },
] satisfies { label: PostReaction; icon: typeof CircleHelp }[]

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
