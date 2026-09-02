import type { Board, PostReaction } from '../../types/domain'

export const reactionLabels: PostReaction[] = ['저도 궁금해요', '지금도 그래요', '도움 됐어요', '이제 끝났어요']

export function PostReactions({ board, interactive = false, onReact }: { board: Board; interactive?: boolean; onReact?: (reaction: PostReaction) => void }) {
  return <div className={`post-reactions ${interactive ? 'interactive' : ''}`}>{reactionLabels.map((label) => interactive
    ? <button key={label} className={board.reactedByMe === label ? 'selected' : ''} onClick={() => onReact?.(label)}><b>{label}</b> {board.reactions[label]}</button>
    : <span key={label}><b>{label}</b> {board.reactions[label]}</span>
  )}</div>
}
