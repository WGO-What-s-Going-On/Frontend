import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'
import { findSimilarBoard } from '../../domain/duplicate'
import { findPersonalInfo } from '../../domain/privacy'
import type { Board, Category } from '../../types/domain'

// 사진 파일을 미리보기·저장용 data URL로 읽는다 (목업 전용, 실제로는 업로드 후 받은 주소를 쓴다)
export function readImage(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

// 주변 활성 사용자 수를 대략적인 범위로 (MAP-F16)
export function nearbyRange(count: number) {
  const low = Math.floor(count / 10) * 10
  return `약 ${low}~${low + 10}명`
}

// 게시글 표시 방식 선택 (USR-F08): 닉네임 또는 익명
export function AuthorToggle({ anonymous, onChange }: { anonymous: boolean; onChange: (anonymous: boolean) => void }) {
  const { user } = useApp()
  return <div className="author-toggle" role="radiogroup" aria-label="작성자 표시">
    <button role="radio" aria-checked={!anonymous} className={!anonymous ? 'selected' : ''} onClick={() => onChange(false)}>{user.nickname}</button>
    <button role="radio" aria-checked={anonymous} className={anonymous ? 'selected' : ''} onClick={() => onChange(true)}>익명</button>
  </div>
}

type GuardStep = { kind: 'privacy'; labels: string[] } | { kind: 'duplicate'; board: Board } | null

// 올리기 전 확인: 개인정보가 보이면 경고하고(MOD-F05), 게시글이면 비슷한 게시판을 먼저 추천한다(PST-F17)
export function usePublishGuard() {
  const { boards, openBoard } = useApp()
  const [step, setStep] = useState<GuardStep>(null)
  const pending = useRef<{ text: string; category?: Category; proceed: () => void }>(undefined)

  const next = (privacyChecked: boolean) => {
    const request = pending.current
    if (!request) return
    if (!privacyChecked) {
      const labels = findPersonalInfo(request.text)
      if (labels.length) { setStep({ kind: 'privacy', labels }); return }
    }
    const similar = request.category && findSimilarBoard(boards, request.category, request.text)
    if (similar) { setStep({ kind: 'duplicate', board: similar }); return }
    setStep(null)
    request.proceed()
  }
  const guard = (text: string, category: Category | undefined, proceed: () => void) => {
    pending.current = { text, category, proceed }
    next(false)
  }
  const close = () => setStep(null)

  const dialog = step && <div className="dialog-backdrop guard-backdrop" role="presentation" onClick={close}>
    <section className="dialog guard-dialog" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      {step.kind === 'privacy' ? <>
        <h2>개인정보가 포함된 것 같아요</h2>
        <p>{step.labels.join(', ')}처럼 보이는 내용이 있어요. 다른 사람에게 공개돼도 괜찮은지 확인해 주세요.</p>
        <div className="dialog-actions"><Button onClick={close}>수정하기</Button><Button className="primary-button" onClick={() => next(true)}>그대로 올리기</Button></div>
      </> : <>
        <h2>비슷한 게시판이 이미 있어요</h2>
        <p>근처에서 같은 상황을 이야기하고 있어요. 새로 만드는 대신 기존 게시판에 참여해 보세요.</p>
        <button className="guard-similar" onClick={() => { close(); openBoard(step.board.id) }}><strong>{step.board.title}</strong><small>{step.board.distance}m · {step.board.createdAt}</small></button>
        <div className="dialog-actions"><Button onClick={() => { close(); pending.current?.proceed() }}>새로 만들기</Button><Button className="primary-button" onClick={() => { close(); openBoard(step.board.id) }}>기존 게시판 보기</Button></div>
      </>}
    </section>
  </div>

  return { guard, dialog }
}
