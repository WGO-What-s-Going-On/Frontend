import { CircleCheck, CircleHelp, Lightbulb, Radio } from 'lucide-react'
import { reactionLabel } from '../../domain/labels'
import type { Board, PostReaction } from '../../types/domain'

export const reactionLabels: PostReaction[] = ['저도 궁금해요', '지금도 그래요', '도움 됐어요', '이제 끝났어요']
const reactionOptions = [
  { label: '저도 궁금해요', icon: CircleHelp },
  { label: '지금도 그래요', icon: Radio },
  { label: '도움 됐어요', icon: Lightbulb },
  { label: '이제 끝났어요', icon: CircleCheck },
] satisfies { label: PostReaction; icon: typeof CircleHelp }[]

export function PostReactions({ board, interactive = false, fullLabels = false, onReact }: { board: Board; interactive?: boolean; fullLabels?: boolean; onReact?: (reaction: PostReaction) => void }) {
  return <div className={`post-reactions ${interactive ? 'interactive' : ''} ${fullLabels ? 'full-labels' : ''}`}>{reactionOptions.map(({ label, icon: Icon }) => { const { full: fullLabel, short: shortLabel } = reactionLabel[label]; return interactive
    ? <button key={label} className={board.reactedByMe === label ? 'selected' : ''} onClick={() => onReact?.(label)} aria-label={`${fullLabel} ${board.reactions[label]}`} title={fullLabel}><Icon size={15}/><b>{fullLabels ? fullLabel : shortLabel}</b><span>{board.reactions[label]}</span></button>
    : <span key={label} title={fullLabel}><Icon size={15}/><b>{fullLabels ? fullLabel : shortLabel}</b><small>{board.reactions[label]}</small></span>
  })}</div>
}
