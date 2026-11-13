import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useStatusTint } from '../../components/ui/statusTint'
import { useApp } from '../../context/AppContext'

// 이동 중 글쓰기 제한 안내 (서버 #123).
// 버스 · 기차처럼 빠르게 이동 중이면 글 작성이 막히고, 같은 자리에서 10초 멈춘 것이 확인되면 풀린다.
// 떠 있는 동안 위치를 5초마다 보내 서버가 정지를 확인하게 하고, 12초 뒤 '다시 올리기'를 연다 (쓴 내용 · 사진은 그대로)
const WAIT_SECONDS = 12

export function MovingDialog({ onClose, onRetry }: { onClose: () => void; onRetry: () => void }) {
  const { keepLocationFresh } = useApp()
  const backdrop = useRef<HTMLDivElement>(null)
  useStatusTint(backdrop)
  const [remaining, setRemaining] = useState(WAIT_SECONDS)

  useEffect(() => keepLocationFresh(5000), [])
  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  const ready = remaining <= 0
  return <div ref={backdrop} className="dialog-backdrop" role="presentation">
    <section className="dialog moving-dialog" role="alertdialog" aria-modal="true" aria-labelledby="moving-title" aria-describedby="moving-body">
      <h2 id="moving-title">이동 중에는 글을 올릴 수 없어요</h2>
      <p id="moving-body">버스나 기차로 빠르게 이동하는 중이에요.{'\n'}멈춘 자리에서 10초쯤 기다리면 올릴 수 있어요.</p>
      <div className="moving-progress" aria-hidden="true"><i style={{ animationDuration: `${WAIT_SECONDS}s` }}/></div>
      <small className="moving-status" aria-live="polite">{ready ? '이제 다시 올릴 수 있어요' : `멈춤 확인 중 · ${remaining}초`}</small>
      <div className="dialog-actions">
        <Button onClick={onClose}>닫기</Button>
        <Button className="primary-button" disabled={!ready} onClick={onRetry}>다시 올리기</Button>
      </div>
    </section>
  </div>
}
