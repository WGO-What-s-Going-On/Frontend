import { Flag, Lightbulb, MessageCircleQuestion, Radio } from 'lucide-react'
import type { Board, PostReaction } from '../../types/domain'

export const reactionLabels: PostReaction[] = ['저도 궁금해요', '지금도 그래요', '도움 됐어요', '이제 끝났어요']
const reactionOptions = [
  { label: '저도 궁금해요', shortLabel: '궁금', fullLabel: '저도 궁금해요', icon: MessageCircleQuestion },
  { label: '지금도 그래요', shortLabel: '진행 중', fullLabel: '아직 진행 중이에요', icon: Radio },
  { label: '도움 됐어요', shortLabel: '도움됨', fullLabel: '도움돼요', icon: Lightbulb },
  { label: '이제 끝났어요', shortLabel: '종료', fullLabel: '종료됐어요', icon: Flag },
] satisfies { label: PostReaction; shortLabel: string; fullLabel: string; icon: typeof MessageCircleQuestion }[]

export function PostReactions({ board, interactive = false, fullLabels = false, onReact }: { board: Board; interactive?: boolean; fullLabels?: boolean; onReact?: (reaction: PostReaction) => void }) {
  return <div className={`post-reactions ${interactive ? 'interactive' : ''} ${fullLabels ? 'full-labels' : ''}`}>{reactionOptions.map(({ label, shortLabel, fullLabel, icon: Icon }) => interactive
    ? <button key={label} className={board.reactedByMe === label ? 'selected' : ''} onClick={() => onReact?.(label)} aria-label={`${fullLabel} ${board.reactions[label]}`} title={fullLabel}><Icon size={15}/><b>{fullLabels ? fullLabel : shortLabel}</b><span>{board.reactions[label]}</span></button>
    : <span key={label} title={fullLabel}><Icon size={15}/><b>{fullLabels ? fullLabel : shortLabel}</b><small>{board.reactions[label]}</small></span>
  )}</div>
}
