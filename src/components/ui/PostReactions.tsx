import { CircleCheck, CircleHelp, Radio, ThumbsUp } from 'lucide-react'
import type { Board, PostReaction } from '../../types/domain'

export const reactionLabels: PostReaction[] = ['저도 궁금해요', '지금도 그래요', '도움 됐어요', '이제 끝났어요']
const reactionOptions = [
  { label: '저도 궁금해요', shortLabel: '궁금', icon: CircleHelp },
  { label: '지금도 그래요', shortLabel: '진행 중', icon: Radio },
  { label: '도움 됐어요', shortLabel: '도움됨', icon: ThumbsUp },
  { label: '이제 끝났어요', shortLabel: '종료', icon: CircleCheck },
] satisfies { label: PostReaction; shortLabel: string; icon: typeof CircleHelp }[]

export function PostReactions({ board, interactive = false, onReact }: { board: Board; interactive?: boolean; onReact?: (reaction: PostReaction) => void }) {
  return <div className={`post-reactions ${interactive ? 'interactive' : ''}`}>{reactionOptions.map(({ label, shortLabel, icon: Icon }) => interactive
    ? <button key={label} className={board.reactedByMe === label ? 'selected' : ''} onClick={() => onReact?.(label)} aria-label={`${label} ${board.reactions[label]}`} title={label}><Icon size={16}/><b>{shortLabel}</b><span>{board.reactions[label]}</span></button>
    : <span key={label} title={label}><Icon size={16}/><b>{shortLabel}</b><small>{board.reactions[label]}</small></span>
  )}</div>
}
