import { useState } from 'react'
import { Check, ChevronRight, MapPin } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { BackHeader } from '../../components/ui/BackHeader'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'
import { nicknameError } from '../../domain/nickname'

// 필수 약관 (USR-F02)
const terms = [
  { id: 'service', label: '서비스 이용약관' },
  { id: 'privacy', label: '개인정보 처리방침' },
  { id: 'location', label: '위치정보 이용약관' },
] as const

export function TermsScreen() {
  const { agreeTerms, go } = useApp()
  const [agreed, setAgreed] = useState<string[]>([])
  const allAgreed = agreed.length === terms.length
  const toggle = (id: string) => setAgreed((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  return <AppShell nav={false} contentClassName="onboarding-screen">
    <BackHeader title="" onBack={() => go('login')}/>
    <h1 className="onboarding-title">서비스 이용을 위해<br/>약관에 동의해 주세요</h1>
    <button className={`terms-all ${allAgreed ? 'checked' : ''}`} onClick={() => setAgreed(allAgreed ? [] : terms.map((term) => term.id))} aria-pressed={allAgreed}><span className="terms-check"><Check size={16}/></span>전체 동의</button>
    <ul className="terms-list">{terms.map((term) => <li key={term.id}>
      <button className={`terms-item ${agreed.includes(term.id) ? 'checked' : ''}`} onClick={() => toggle(term.id)} aria-pressed={agreed.includes(term.id)}><span className="terms-check"><Check size={14}/></span><span><b>[필수]</b> {term.label}</span></button>
      <ChevronRight size={18} aria-hidden="true"/>
    </li>)}</ul>
    <div className="onboarding-bottom"><Button className="primary" onClick={agreeTerms} disabled={!allAgreed}>다음</Button></div>
  </AppShell>
}

// 닉네임 설정 (USR-F05): 중복·금칙어 확인. 실제 확인은 백엔드가 하고, 목업에서는 이미 쓰이는 이름과 예시 금칙어로 확인한다.

export function NicknameScreen() {
  const { boards, comments, user, completeNickname, go } = useApp()
  const [nickname, setNickname] = useState('')
  const trimmed = nickname.trim()
  const taken = new Set([...boards, ...comments].filter((item) => item.authorId !== user.id).map((item) => item.authorName))
  const error = nicknameError(trimmed, taken)
  return <AppShell nav={false} contentClassName="onboarding-screen">
    <BackHeader title="" onBack={() => go('terms')}/>
    <h1 className="onboarding-title">어떤 이름으로<br/>활동할까요?</h1>
    <p className="onboarding-help">실명 대신 닉네임으로 활동해요. 글을 쓸 때 익명으로 바꿀 수도 있어요.</p>
    <input className={`field nickname-field ${error ? 'invalid' : ''}`} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="닉네임 (2~12자)" maxLength={12} autoComplete="nickname"/>
    <p className={`nickname-message ${error ? 'error' : trimmed ? 'ok' : ''}`} aria-live="polite">{error || (trimmed ? '사용할 수 있는 닉네임이에요.' : ' ')}</p>
    <div className="onboarding-bottom"><Button className="primary" onClick={() => completeNickname(trimmed)} disabled={!trimmed || Boolean(error)}>시작하기</Button></div>
  </AppShell>
}

// 위치 권한 요청 (MAP-F01): 거부하면 무엇이 제한되는지 안내한다
export function LocationPermissionScreen() {
  const { setLocationPermission } = useApp()
  return <AppShell nav={false} contentClassName="onboarding-screen permission-screen">
    <span className="permission-icon" aria-hidden="true"><MapPin size={30}/></span>
    <h1 className="onboarding-title">내 주변 150m 소식을 보려면<br/>위치 권한이 필요해요</h1>
    <ul className="permission-list">
      <li>지금 있는 곳 주변의 게시판을 보여줘요</li>
      <li>150m 안에 있을 때만 글과 댓글을 쓸 수 있어요</li>
      <li>정확한 위치는 다른 사람에게 공개되지 않아요</li>
    </ul>
    <p className="onboarding-help">허용하지 않으면 게시판은 볼 수 있지만 글쓰기·댓글·사진 올리기가 제한돼요.</p>
    <div className="onboarding-bottom"><Button className="primary" onClick={() => setLocationPermission('granted')}>위치 권한 허용</Button><Button className="onboarding-later" onClick={() => setLocationPermission('denied')}>나중에 하기</Button></div>
  </AppShell>
}
