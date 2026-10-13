// 가운데가 깊게 파인 하트. lucide Heart보다 위쪽 홈이 깊어 하트 모양이 또렷하다.
export function HeartIcon({ size = 18, filled = false }: { size?: number; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round">
    <path d="M12 20.6C10.6 19.7 2.6 14.6 2.1 9.2 1.8 5.9 4.2 3.4 7.1 3.4c2.2 0 4 1.4 4.9 3.9.9-2.5 2.7-3.9 4.9-3.9 2.9 0 5.3 2.5 5 5.8-.5 5.4-8.5 10.5-9.9 11.4z"/>
  </svg>
}
