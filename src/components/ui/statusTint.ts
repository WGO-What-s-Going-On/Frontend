import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

// 상태바(시간 · 와이파이) 뒤 색 맞추기.
// Safari · 홈 화면 앱은 웹 화면을 상태바 밑으로 깔 수 없고, 그 자리를 페이지 바탕색(html · body)과 theme-color로 칠한다.
// 어두운 배경 · 사진 보기가 뜨면 그 아래 화면 맨 위가 어두워지는데 상태바만 흰 띠로 남아서,
// 떠 있는 배경들의 색을 화면 바탕 위에 겹친 색을 계산해 상태바 자리에 칠한다 (겹쳐 뜨면 위에 뜬 것까지 겹친다)
const layers: HTMLElement[] = []

type Rgb = [number, number, number]
const parse = (color: string): [number, number, number, number] => {
  const [r = 255, g = 255, b = 255, a = 1] = color.match(/[\d.]+/g)?.map(Number) ?? []
  return [r, g, b, a]
}
const hex = (rgb: Rgb) => `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`

function apply() {
  const root = document.documentElement
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  root.style.removeProperty('--status-tint')
  if (!layers.length) {
    // 시작 화면이 떠 있는 동안은 시작 화면 색 그대로 (닫힐 때 main.tsx가 평소 색으로 되돌린다)
    if (meta?.dataset.default && !root.classList.contains('launching')) meta.content = meta.dataset.default
    return
  }
  // 화면 바탕(로그인 첫 화면이면 연한 파랑) 위에 떠 있는 배경들을 차례로 겹친다
  const [r, g, b] = parse(getComputedStyle(document.body).backgroundColor)
  const tint = layers.reduce<Rgb>((base, layer) => {
    const [lr, lg, lb, la] = parse(getComputedStyle(layer).backgroundColor)
    return [base[0] * (1 - la) + lr * la, base[1] * (1 - la) + lg * la, base[2] * (1 - la) + lb * la]
  }, [r, g, b])
  root.style.setProperty('--status-tint', hex(tint))
  if (meta) meta.content = hex(tint)
}

// 평소 상태바 색 (화면 모드: 라이트 흰색 · 다크 진회색)
export function setBaseStatusColor(color: string) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.dataset.default = color
  apply()
}

// 어두운 배경 요소에 붙인다. 화면에 그려지기 전에 칠해서 배경과 상태바가 같이 바뀐다
export function useStatusTint(backdrop: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = backdrop.current
    if (!element) return
    layers.push(element)
    apply()
    return () => {
      layers.splice(layers.indexOf(element), 1)
      apply()
    }
  }, [backdrop])
}
