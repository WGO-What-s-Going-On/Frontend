import { CircleCheck, CircleHelp, Radio, ThumbsUp } from 'lucide-react'
import type { Board, PostReaction } from '../../types/domain'

/**
 * 반응 4개를 평등하게 나열하면 "지금 이 상황이 유효한가"라는 가장 중요한 질문이 묻힌다.
 * 진행/종료 두 신호를 먼저 요약해 보여주고, 나머지 둘은 보조 행동으로 내린다.
 */
const PRIMARY = [
  { label: '지금도 그래요', short: '진행 중', icon: Radio },
  { label: '이제 끝났어요', short: '끝났어요', icon: CircleCheck },
] satisfies { label: PostReaction; short: string; icon: typeof Radio }[]

const SECONDARY = [
  { label: '저도 궁금해요', short: '나도 궁금', icon: CircleHelp },
  { label: '도움 됐어요', short: '도움 됨', icon: ThumbsUp },
] satisfies { label: PostReaction; short: string; icon: typeof CircleHelp }[]

function verdict(ongoing: number, ended: number) {
  const total = ongoing + ended
  if (!total) return { text: '아직 확인한 사람이 없어요', ratio: 0.5, empty: true }
  const ratio = ongoing / total
  if (ratio >= 0.6) return { text: `${total}명 중 ${ongoing}명이 아직 진행 중이라고 답했어요`, ratio, empty: false }
  if (ratio <= 0.4) return { text: `${total}명 중 ${ended}명이 상황이 끝났다고 답했어요`, ratio, empty: false }
  return { text: '의견이 갈리고 있어요', ratio, empty: false }
}

export function SituationPulse({ board, interactive = false, onReact }: { board: Board; interactive?: boolean; onReact?: (reaction: PostReaction) => void }) {
  const ongoing = board.reactions['지금도 그래요']
  const ended = board.reactions['이제 끝났어요']
  const { text, ratio, empty } = verdict(ongoing, ended)
  return <section className="situation-pulse" aria-label="현재 상황">
    <p className="pulse-verdict">{text}</p>
    {!empty && <div className="pulse-bar" role="img" aria-label={`진행 중 ${ongoing}, 끝남 ${ended}`}><i style={{ width: `${Math.round(ratio * 100)}%` }}/></div>}
    <div className="pulse-primary">{PRIMARY.map(({ label, short, icon: Icon }) => <button
      key={label}
      className={board.reactedByMe === label ? 'selected' : ''}
      disabled={!interactive}
      onClick={() => onReact?.(label)}
    ><Icon size={17}/><b>{short}</b><span>{board.reactions[label]}</span></button>)}</div>
    <div className="pulse-secondary">{SECONDARY.map(({ label, short, icon: Icon }) => <button
      key={label}
      className={board.reactedByMe === label ? 'selected' : ''}
      disabled={!interactive}
      onClick={() => onReact?.(label)}
    ><Icon size={14}/>{short} {board.reactions[label]}</button>)}</div>
  </section>
}
