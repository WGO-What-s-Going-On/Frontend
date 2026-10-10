import './states.css'

// 불러오는 동안 실제 콘텐츠 자리를 잡아 두는 회색 막대. 크기는 실제 콘텐츠와 맞춘다.
export function Skeleton({ width = '100%', height = 14, radius = 6 }: { width?: number | string; height?: number | string; radius?: number }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true"/>
}

// 게시판 목록 카드 한 장 크기의 자리
export function BoardCardSkeleton() {
  return <div className="skeleton-card" aria-hidden="true"><Skeleton width={56} height={20} radius={10}/><Skeleton width="72%" height={18}/><Skeleton width="90%" height={12}/><Skeleton width="40%" height={11}/></div>
}

// 댓글·알림 한 줄 크기의 자리
export function RowSkeleton() {
  return <div className="skeleton-row" aria-hidden="true"><Skeleton width={28} height={28} radius={14}/><span><Skeleton width="38%" height={12}/><Skeleton width="86%" height={13}/></span></div>
}
