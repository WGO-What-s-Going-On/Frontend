import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ImageOff } from 'lucide-react'

// 서버 사진 한 장. 받는 동안은 사진 자리에 옅은 빛이 지나가는 회색 칸, 다 받으면 사진이 부드럽게 나타난다.
// 못 받으면 회색 칸에 작은 사진 아이콘만 남긴다. 감싸는 칸(position: relative)의 크기를 그대로 채운다
export function PhotoImg({ src, alt, lazy = false, style }: { src: string; alt: string; lazy?: boolean; style?: CSSProperties }) {
  const ref = useRef<HTMLImageElement>(null)
  // 어느 주소를 다 받았는지 · 실패했는지 (주소가 바뀌면 다시 받는 중으로)
  const [state, setState] = useState<{ src: string; status: 'loaded' | 'instant' | 'failed' } | null>(null)
  const status = state?.src === src ? state.status : 'loading'
  // 이미 받아 둔 사진(브라우저 캐시)이면 그리기 전에 바로 보여 준다 (페이드 없이)
  useLayoutEffect(() => {
    const img = ref.current
    if (img?.complete && img.naturalWidth > 0) setState({ src, status: 'instant' })
  }, [src])
  return <>
    <img ref={ref} className={`photo-img ${status}`} src={src} alt={alt} loading={lazy ? 'lazy' : undefined} draggable={false} style={style}
      onLoad={() => setState((current) => current?.src === src && current.status === 'instant' ? current : { src, status: 'loaded' })}
      onError={() => setState({ src, status: 'failed' })}/>
    {status === 'loading' && <span className="photo-loading" aria-hidden="true"/>}
    {status === 'failed' && <span className="photo-failed" aria-label="사진을 불러오지 못했어요"><ImageOff size={20} strokeWidth={1.8}/></span>}
  </>
}
