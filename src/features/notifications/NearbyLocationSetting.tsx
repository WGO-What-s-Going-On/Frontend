import { useState } from 'react'
import { useApp } from '../../context/AppContext'

export function NearbyLocationSetting() {
  const { live, notificationSettings, nearbyNotifications: nearby } = useApp()
  const [consent, setConsent] = useState(false)
  if (!live) return null
  const active = nearby.subscription?.enabled && nearby.subscription.locationConsent
  const available = nearby.subscription?.featureEnabled
  return <section className="menu-group setting-list" aria-label="주변 알림 위치 동의">
    <div className="setting-toggle"><span><strong>주변 알림을 위한 위치 이용</strong><small>
      동의하면 현재 위치를 주변 새 글 알림에 이용해요. 반경 150m의 새 글을 알려드리며, 위치는 최대 15분 뒤 만료돼요.
      앱을 보는 동안 새 위치로 갱신하며, 아래에서 언제든 철회할 수 있어요. 지도 위치 권한과는 별도 동의예요.
    </small></span></div>
    {active ? <div className="setting-toggle"><span><strong>위치 이용에 동의한 상태예요</strong><small>앱을 닫거나 위치 갱신이 중단되면 최대 15분 뒤 주변 알림이 멈춰요.</small></span><button disabled={nearby.busy} onClick={() => { void nearby.revoke()?.catch(() => undefined); setConsent(false) }}>동의 철회</button></div>
      : <>
        <label className="setting-toggle"><span>주변 알림 목적으로 현재 위치를 이용하는 데 동의해요</span><input type="checkbox" checked={consent} disabled={!available || nearby.busy} onChange={(event) => setConsent(event.target.checked)}/></label>
        <button className="primary" disabled={!consent || !available || !notificationSettings.nearby || nearby.busy} onClick={() => { void nearby.enable(consent) }}>동의하고 주변 알림 켜기</button>
      </>}
    {!available && nearby.subscription && <p role="status">주변 새 글 알림은 준비 중이에요.</p>}
    {!notificationSettings.nearby && <p>위의 ‘내 주변 새 게시판’ 알림도 켜 주세요.</p>}
    {nearby.error && <p role="alert">위치나 동의 상태를 갱신하지 못했어요. 설정을 확인하고 다시 시도해 주세요.</p>}
  </section>
}
