import { createLucideIcon } from 'lucide-react'

// 활동 탭 왕관: lucide 왕관에서 아래 받침 줄을 빼고, 가운데 꼭짓점 위에 동그란 점 하나.
// 받침 줄이 빠진 만큼 왕관을 4 아래로 내려 가운데에 맞춘다
export const CrownIcon = createLucideIcon('crown-dot', [
  ['path', { d: 'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z', transform: 'translate(0 4)', key: 'crown' }],
  ['circle', { cx: '12', cy: '2.6', r: '1', fill: 'currentColor', key: 'dot' }],
])
