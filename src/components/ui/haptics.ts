import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// 가벼운 햅틱(톡). 앱(iOS · 안드로이드)은 기기 햅틱, 안드로이드 브라우저는 진동 API,
// iOS Safari는 진동 API가 없어 iOS 18부터 생긴 스위치 햅틱(<input type="checkbox" switch>)을 숨겨 두고 누른다.
// iOS Safari는 화면을 '누른 직후'에만 햅틱을 허용해서, 꾹 누르는 중(손가락을 떼기 전)에는 울리지 않을 수 있다
let iosSwitch: HTMLLabelElement | null = null

function iosSwitchTick() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label')
    iosSwitch.setAttribute('aria-hidden', 'true')
    iosSwitch.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    iosSwitch.appendChild(input)
    document.body.appendChild(iosSwitch)
  }
  iosSwitch.click()
}

export function haptic(style: 'light' | 'medium' = 'light') {
  try {
    if (Capacitor.isNativePlatform()) { Haptics.impact({ style: style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => undefined); return }
    if (typeof navigator.vibrate === 'function') { navigator.vibrate(style === 'medium' ? 14 : 8); return }
    iosSwitchTick()
  } catch { /* 햅틱이 없어도 동작은 그대로 */ }
}
