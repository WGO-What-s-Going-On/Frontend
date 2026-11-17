import { useMemo, useRef, useState } from 'react'
import { Ellipsis, EllipsisVertical, Share, SquarePlus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useStatusTint } from '../../components/ui/statusTint'
import mascotWave from '../../assets/mascot/wave.webp'
import { openedFrom, useInstallPrompt } from './homeScreen'

type Os = 'ios' | 'android'
const steps: Record<Os, React.ReactNode[]> = {
  ios: [
    <>공유 <Share size={15}/> 누르기<small>Safari는 아래 <Ellipsis size={13}/> 안에 있어요</small></>,
    <>홈 화면에 추가 <SquarePlus size={15}/></>,
    <>오른쪽 위 추가</>,
  ],
  android: [
    <>오른쪽 위 메뉴 <EllipsisVertical size={15}/></>,
    <>홈 화면에 추가 (또는 앱 설치)</>,
    <>설치</>,
  ],
}

// 홈 화면에 추가하는 방법: 지금 기기(iPhone · Android)를 먼저 보여 주고 바꿔 볼 수 있다.
// 안드로이드 Chrome이 설치 창을 허락하면 바로 띄우는 버튼, 카카오톡 같은 앱 안 브라우저면 다른 브라우저로 열라는 안내
export function HomeScreenSteps() {
  const from = useMemo(openedFrom, [])
  const { canInstall, install } = useInstallPrompt()
  const [os, setOs] = useState<Os>(from.android ? 'android' : 'ios')
  return <div className="home-steps">
    {from.inApp && <p className="home-steps-warn">카카오톡 같은 앱 안에서는 추가할 수 없어요. 먼저 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러요.</p>}
    <div className="home-os" role="tablist" aria-label="휴대폰 종류">
      {(['ios', 'android'] as const).map((value) => <button key={value} role="tab" aria-selected={os === value} className={os === value ? 'active' : ''} onClick={() => setOs(value)}>{value === 'ios' ? 'iPhone' : 'Android'}</button>)}
    </div>
    <ol>{steps[os].map((step, index) => <li key={index}><b>{index + 1}</b><span>{step}</span></li>)}</ol>
    {os === 'android' && canInstall && <Button className="primary" onClick={install}>지금 추가하기</Button>}
  </div>
}

// 가입 직후 지도에서 한 번 띄우는 안내 (둘러보기가 끝난 뒤). 홈 화면 앱으로 열어야 알림을 받아서 가장 먼저 알린다
export function HomeScreenSheet({ onClose }: { onClose: () => void }) {
  const backdrop = useRef<HTMLDivElement>(null)
  useStatusTint(backdrop)
  return <div ref={backdrop} className="home-sheet-backdrop" role="presentation">
    <section className="home-sheet" role="dialog" aria-modal="true" aria-labelledby="home-sheet-title">
      <img src={mascotWave} alt="" width={56}/>
      <h2 id="home-sheet-title">홈 화면에 추가해 주세요</h2>
      <p>추가한 앱으로 열어야 새 글 · 댓글 <mark>알림을 받을 수 있어요</mark>.</p>
      <HomeScreenSteps/>
      <div className="home-sheet-actions">
        <Button className="primary" onClick={onClose}>확인했어요</Button>
        <small>마이 → 이용 가이드에서 다시 볼 수 있어요</small>
      </div>
    </section>
  </div>
}
