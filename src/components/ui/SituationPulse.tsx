import type { Board, PostReaction } from '../../types/domain'

/**
 * 반응 4개를 평등하게 나열하면 "지금 이 상황이 유효한가"라는 가장 중요한 질문이 묻힌다.
 * 두 숫자를 비교시키는 대신 결론을 먼저 말하고, 나머지 둘은 보조로 내린다.
 */
const PRIMARY: PostReaction[] = ['지금도 그래요', '이제 끝났어요']
const SECONDARY: PostReaction[] = ['저도 궁금해요', '도움 됐어요']

function verdict(ongoing: number, ended: number) {
  const total = ongoing + ended
  if (!total) return '아직 확인한 사람이 없어요'
  const ratio = ongoing / total
  if (ratio >= 0.6) return '아직 진행 중'
  if (ratio <= 0.4) return '끝난 것 같아요'
  return '의견이 갈려요'
}

export function SituationPulse({ board, interactive = false, onReact }: { board: Board; interactive?: boolean; onReact?: (reaction: PostReaction) => void }) {
  return <section className="situation-pulse">
    <p className="pulse-verdict">{verdict(board.reactions['지금도 그래요'], board.reactions['이제 끝났어요'])}</p>
    <div className="pulse-primary">{PRIMARY.map((label) => <button
      key={label}
      className={board.reactedByMe === label ? 'selected' : ''}
      disabled={!interactive}
      onClick={() => onReact?.(label)}
    >{label} {board.reactions[label]}</button>)}</div>
    <div className="pulse-secondary">{SECONDARY.map((label) => <button
      key={label}
      className={board.reactedByMe === label ? 'selected' : ''}
      disabled={!interactive}
      onClick={() => onReact?.(label)}
    >{label} {board.reactions[label]}</button>)}</div>
  </section>
}
